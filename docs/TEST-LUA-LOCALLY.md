# Testing Lua Platform on your Mac

This guide is for trying out Lua Platform yourself — no coding
knowledge needed. It walks through starting everything with one
command, opening the three apps (Guest, Staff, Admin), and testing the
real flows a customer, a barista, and an admin would each use.

Everything here runs **only on your own Mac** — nothing is uploaded or
made public. Closing your laptop or losing Wi-Fi doesn't affect
anything except your own local test session.

---

## SECTION A — Start Lua

1. Open **Terminal** (Spotlight search → type "Terminal" → Enter).
2. Type this and press Enter to go to the project folder:
   ```
   cd /Users/nikolay/Desktop/Project/LUA
   ```
3. Type this and press Enter:
   ```
   pnpm demo:start
   ```
4. Wait for the line that says **"Lua Platform is ready"**. The first
   time you run this it can take up to a minute; after that it's a few
   seconds.

Prefer clicking instead of typing? Double-click **`Start Lua.command`**
in the project folder in Finder — it does the same thing in its own
Terminal window. (First time only, macOS may ask you to confirm you
want to run it — that's normal for any script downloaded/created
locally.)

If something looks wrong before you even start, run `pnpm demo:doctor`
first — it checks everything without changing anything and tells you
exactly what to fix.

## SECTION B — Open the apps

`pnpm demo:start` prints the exact addresses to open, right in the
Terminal window — look for a block like this near the bottom:

```
Guest:
  http://localhost:5173

Staff:
  http://localhost:5174

Admin:
  http://localhost:5175
```

Copy each address into a browser tab (Safari or Chrome both work), or
run `pnpm demo:open` to have Terminal open all three for you
automatically.

## SECTION C — Test Guest (the customer app)

Log in as **Николай** (`nikolay@lua.dev` / `LuaGuest123!` — the login
screen has this pre-filled, just press the login button).

Checklist:

- **Home** — hero, "Lua Club" balance card, Must Try, Collections
- **Menu** — browse categories, look at a few product cards
- **Lua Club** — see the points balance (starts at exactly **3,288**),
  scroll the rewards list
- **QR** — see your own QR code (this is what Staff scans)
- **Orders** — past order history
- **Profile** — switch the language (RU/KK/EN) and confirm the app text changes

## SECTION D — Test Staff (the barista app)

Log in as **Айгерим** (`aigerim@lua.dev` / `LuaStaff123!` — also
pre-filled).

Checklist:

- **Login** works and lands on the Staff home screen
- **Scan** — the browser will ask for camera permission; see Section F
  below for the easiest first test
- **Identity QR** — after scanning a customer's QR, you can pick one of
  their open orders and confirm it (earns points)
- **Reward QR** — after scanning a reward-redemption QR, you see the
  reward name, its cost, and the balance after — confirm to hand it over
- **Shift Log** — visible only to roles that have that permission

## SECTION E — Test Admin (the back-office app)

Log in as **Дана** (`dana@lua.dev` / `LuaStaff123!`).

Checklist:

- **Login**
- **Menu** — edit an existing product (name/price/image), mark
  something out of stock
- **Availability** — toggle a product's in-stock status for a location
- **Rewards** — edit a reward's point cost
- **Customer detail** — open Николай's profile, see his order/point
  history
- **Manual point adjustment** — add or remove points by hand, with a reason
- **Staff** — see the staff list, create a new staff account
- **Journal (Audit)** — see a log of everything above, who did it, and when

## SECTION F — Test with your phone + Mac camera

This is the most realistic test: a phone showing a QR code, and the
Mac's own camera scanning it, exactly like a real till.

**Why this direction and not the reverse:** Staff's scanner needs
camera access, and phone browsers only allow camera access over a
secure connection. `localhost` on the Mac itself is treated as secure
automatically; a plain Wi-Fi address (like `http://192.168.0.20:5174`)
usually is not. Guest, on the other hand, only ever *displays* a QR
code — it never needs the camera — so it works fine on the phone over
plain Wi-Fi.

1. **On the Mac**, run `pnpm demo:start` if you haven't already, and
   note the "Guest on your phone" address it prints (something like
   `http://192.168.0.20:5173`).
2. **On your iPhone**, make sure it's on the **same Wi-Fi network** as
   the Mac, open Safari, and go to that address.
3. Log in as Николай on the phone, go to **QR**, and leave that screen open.
4. **On the Mac**, open Staff at `http://localhost:5174` and log in as Айгерим.
5. Go to **Scan** and allow camera access when asked.
6. Point the Mac's camera at the QR code on the phone screen.
7. Staff shows the customer's name and balance — pick an order (or, for
   a reward, the reward details) and confirm.
8. **Back on the phone**, pull to refresh (or navigate away and back)
   on the Lua Club / Orders screen — the new balance/order appears.

If the phone can't reach the Mac's address at all, see Troubleshooting
below (Wi-Fi isolation is the most common cause).

## SECTION G — Reset everything

To put the demo back to its starting state (Николай back to exactly
3,288 points, the demo order restored, etc.):

```
pnpm demo:reset
```

This only ever touches this project's own local test database — see
"Known limitations" below. Safe to run as many times as you like.

## SECTION H — Stop Lua

```
pnpm demo:stop
```

or double-click **`Stop Lua.command`**. This stops the three apps, the
backend, and the local database process — nothing is left running in
the background.

## SECTION I — Troubleshooting

**"Port already in use" / demo:start fails to start something**
Run `pnpm demo:doctor` — it shows exactly which port is the problem. If
it says a port is used by "another process" (not "our demo"), something
else on your Mac is using that port; quit that other thing, or run
`pnpm demo:stop` first in case a previous session didn't shut down
cleanly.

**Database won't start**
Run `pnpm demo:doctor` and check the "PostgreSQL binaries" line. If it's
missing, install it once with `brew install postgresql@16`.

**Phone can't open the Mac's LAN address**
- Confirm the phone is on the **same Wi-Fi network** as the Mac (not a
  guest network — see next point).
- Some Wi-Fi networks (many cafés, some routers' "Guest" networks, some
  mesh routers) have **client/AP isolation** turned on, which
  deliberately blocks devices on the same network from reaching each
  other. Test on a home network first, or check your router's settings
  for "AP isolation" / "client isolation" / "guest network isolation".
- Double-check the address: it must be the one `pnpm demo:start` just
  printed (your Mac's IP can change between Wi-Fi networks/sessions).

**Camera permission denied on Staff**
Safari/Chrome remembers a "denied" choice per site. Open the browser's
site settings for `localhost:5174` and change Camera back to "Ask" or
"Allow", then reload the Scan screen.

**QR expired / QR already used**
Both are expected, not bugs — a QR code is only valid for a short
window and only usable once (see `docs/QR-SECURITY.md`). Go back to
Guest, open a fresh QR, and scan again.

**Backend unreachable ("Не удалось связаться с сервером")**
Check `pnpm demo:doctor`, or open `http://localhost:4000/health`
directly in a browser — it should show `{"ok":true,...}`. If not, the
API isn't running; `pnpm demo:start` again.

**Wi-Fi devices seem isolated / firewall prompts**
The very first time the Mac's backend or a dev server accepts an
incoming connection, macOS may show a one-time firewall prompt
("Do you want the application … to accept incoming network
connections?") — click **Allow**. This project's launcher never changes
firewall settings itself; if you want to double-check, System Settings
→ Network → Firewall.

---

## Known limitations of this local demo

- **Local only.** There is no production deployment — this is a
  development/demo environment on your own Mac, not a hosted service.
- **Staff's camera scan only really works from the Mac's own
  `localhost`.** A phone can display QR codes fine over Wi-Fi, but
  using a *second* phone as the Staff scanner over plain Wi-Fi will
  likely be blocked by the phone browser's camera-security rules — see
  Section F for the tested, reliable direction.
- **Demo accounts are development-only**, not real customer/staff
  accounts — see the full list in `docs/LOCAL-BACKEND.md`.
- **`pnpm demo:reset` erases and reseeds all local demo data** — orders,
  point history, anything edited in Admin — every time. That's the
  point (a clean, known starting state), but don't run it mid-way
  through something you wanted to keep.
