import AppKit
import Darwin
import WebKit

@main
struct LuaPlatformLauncherMain {
  static func main() {
    let application = NSApplication.shared
    let delegate = LuaPlatformLauncher()
    application.delegate = delegate
    application.run()
  }
}

final class LuaPlatformLauncher: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate {
  private let adminURL = URL(string: "http://127.0.0.1:5175")!
  private var window: NSWindow!
  private var webView: WKWebView?
  private var isStopping = false
  private var lastCommandOutput = ""

  private var projectDirectory: URL {
    Bundle.main.bundleURL.deletingLastPathComponent()
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    saveLauncherLog(command: "launcher", output: "Started from \(projectDirectory.path)")
    NSApp.setActivationPolicy(.regular)
    configureApplicationMenu()
    showStartupWindow()
    startLua()
  }

  func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
    guard !isStopping else { return .terminateNow }

    isStopping = true
    showStoppingState()

    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      self?.runDemoCommand("demo:stop")
      DispatchQueue.main.async {
        NSApp.reply(toApplicationShouldTerminate: true)
      }
    }

    return .terminateLater
  }

  func windowWillClose(_ notification: Notification) {
    NSApp.terminate(nil)
  }

  private func showStartupWindow() {
    let frame = NSRect(x: 0, y: 0, width: 1120, height: 780)
    window = NSWindow(
      contentRect: frame,
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered,
      defer: false
    )
    window.title = "Lua Pastry Studio — Admin"
    window.center()
    window.delegate = self
    window.isReleasedWhenClosed = false
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    setMessage(
      title: "Открываем Lua Admin",
      detail: "Запускаем локальную базу данных и приложение. Это может занять до минуты при первом запуске."
    )
  }

  private func setMessage(title: String, detail: String) {
    let container = NSView()
    container.wantsLayer = true
    container.layer?.backgroundColor = NSColor(calibratedRed: 0.98, green: 0.96, blue: 0.92, alpha: 1).cgColor

    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = .systemFont(ofSize: 24, weight: .semibold)
    titleLabel.textColor = NSColor(calibratedRed: 0.18, green: 0.10, blue: 0.07, alpha: 1)
    titleLabel.alignment = .center

    let detailLabel = NSTextField(wrappingLabelWithString: detail)
    detailLabel.font = .systemFont(ofSize: 15)
    detailLabel.textColor = NSColor(calibratedWhite: 0.32, alpha: 1)
    detailLabel.alignment = .center
    detailLabel.maximumNumberOfLines = 3

    let spinner = NSProgressIndicator()
    spinner.style = .spinning
    spinner.controlSize = .regular
    spinner.startAnimation(nil)

    let stack = NSStackView(views: [titleLabel, detailLabel, spinner])
    stack.orientation = .vertical
    stack.alignment = .centerX
    stack.spacing = 16
    stack.translatesAutoresizingMaskIntoConstraints = false

    container.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: container.centerYAnchor),
      stack.widthAnchor.constraint(lessThanOrEqualToConstant: 520)
    ])

    window.contentView = container
  }

  private func showStoppingState() {
    setMessage(
      title: "Завершаем работу Lua",
      detail: "Останавливаем только локальные сервисы Lua Platform."
    )
  }

  private func startLua() {
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self else { return }
      let status = self.runDemoCommand("demo:start")

      DispatchQueue.main.async {
        guard status == 0 else {
          self.setMessage(
            title: "Lua не удалось запустить",
            detail: "Проверьте, что установлены Node.js, pnpm и PostgreSQL. Подробности находятся в папке .runtime/logs проекта."
          )
          return
        }

        let configuration = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]
        self.webView = webView
        self.window.contentView = webView
        if let phoneURL = self.phoneAdminURL() {
          self.window.title = "Lua Pastry Studio — Admin · iPhone: \(phoneURL)"
        }
        webView.load(URLRequest(url: self.adminURL))
      }
    }
  }

  private func configureApplicationMenu() {
    let mainMenu = NSMenu()
    let applicationItem = NSMenuItem()
    let applicationMenu = NSMenu()

    let copyPhoneAddress = NSMenuItem(
      title: "Скопировать адрес Admin для iPhone",
      action: #selector(copyPhoneAddressToClipboard),
      keyEquivalent: ""
    )
    copyPhoneAddress.target = self
    applicationMenu.addItem(copyPhoneAddress)
    applicationMenu.addItem(.separator())
    applicationMenu.addItem(withTitle: "Закрыть Lua Platform", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

    applicationItem.submenu = applicationMenu
    mainMenu.addItem(applicationItem)
    NSApp.mainMenu = mainMenu
  }

  @objc private func copyPhoneAddressToClipboard() {
    guard let phoneURL = phoneAdminURL() else { return }
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(phoneURL, forType: .string)
  }

  private func phoneAdminURL() -> String? {
    guard let address = lanIPv4Address() else { return nil }
    return "http://\(address):5175"
  }

  private func lanIPv4Address() -> String? {
    var interfaces: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&interfaces) == 0, let first = interfaces else { return nil }
    defer { freeifaddrs(interfaces) }

    var fallback: String?
    for pointer in sequence(first: first, next: { $0.pointee.ifa_next }) {
      let interface = pointer.pointee
      guard let address = interface.ifa_addr, address.pointee.sa_family == UInt8(AF_INET) else { continue }
      let name = String(cString: interface.ifa_name)
      guard name != "lo0" else { continue }

      var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
      let result = getnameinfo(
        address,
        socklen_t(address.pointee.sa_len),
        &hostname,
        socklen_t(hostname.count),
        nil,
        0,
        NI_NUMERICHOST
      )
      guard result == 0 else { continue }
      let ip = String(cString: hostname)
      guard !ip.hasPrefix("169.254.") else { continue }
      if name == "en0" || name == "en1" { return ip }
      fallback = fallback ?? ip
    }

    return fallback
  }

  @discardableResult
  private func runDemoCommand(_ command: String) -> Int32 {
    let process = Process()
    let directory = projectDirectory.appendingPathComponent(".runtime/logs", isDirectory: true)
    let outputFile = directory.appendingPathComponent("launcher-command.log")

    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    FileManager.default.createFile(atPath: outputFile.path, contents: nil)
    let outputHandle = try? FileHandle(forWritingTo: outputFile)

    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    let script = command == "demo:start" ? "scripts/demo/start.mjs" : "scripts/demo/stop.mjs"
    process.arguments = ["node", script]
    process.currentDirectoryURL = projectDirectory
    // Finder normally starts apps with a clean environment. Keep it explicit
    // here as well, so launcher behavior never depends on a terminal, IDE,
    // or a development tool's private environment variables.
    let userHome = FileManager.default.homeDirectoryForCurrentUser.path
    process.environment = [
      "HOME": userHome,
      "USER": NSUserName(),
      "LOGNAME": NSUserName(),
      "SHELL": "/bin/zsh",
      "LANG": "en_US.UTF-8",
      "LC_ALL": "en_US.UTF-8",
      "TMPDIR": NSTemporaryDirectory(),
      "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    ]
    process.standardOutput = outputHandle ?? FileHandle.nullDevice
    process.standardError = outputHandle ?? FileHandle.nullDevice

    do {
      try process.run()
      process.waitUntilExit()
      try? outputHandle?.close()
      lastCommandOutput = (try? String(contentsOf: outputFile, encoding: .utf8)) ?? ""
      saveLauncherLog(command: command, output: lastCommandOutput)
      return process.terminationStatus
    } catch {
      try? outputHandle?.close()
      lastCommandOutput = error.localizedDescription
      saveLauncherLog(command: command, output: lastCommandOutput)
      return 1
    }
  }

  private func saveLauncherLog(command: String, output: String) {
    let directory = projectDirectory.appendingPathComponent(".runtime/logs", isDirectory: true)
    let file = directory.appendingPathComponent("launcher.log")
    let body = "[\(Date())] \(command)\n\(output)\n"

    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try body.write(to: file, atomically: true, encoding: .utf8)
    } catch {
      // A launcher log is diagnostic only. Startup and shutdown should still
      // work when the project directory is temporarily read-only.
    }
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    setMessage(
      title: "Не удалось открыть Admin",
      detail: "Lua уже запущена, но панель управления временно недоступна. Закройте это окно и откройте приложение снова."
    )
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    setMessage(
      title: "Не удалось открыть Admin",
      detail: "Lua уже запущена, но панель управления временно недоступна. Закройте это окно и откройте приложение снова."
    )
  }
}
