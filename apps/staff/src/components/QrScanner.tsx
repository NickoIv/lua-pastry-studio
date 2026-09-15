import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./QrScanner.css";

export type ScannerStatus =
  "requesting" | "active" | "denied" | "unavailable" | "stopped";

export interface QrScannerProps {
  active: boolean;
  onDecode: (text: string) => void;
  onStatusChange?: (status: ScannerStatus) => void;
}

/**
 * Real camera QR scanning: native `BarcodeDetector` where the browser
 * supports it, a `jsQR` canvas-frame fallback everywhere else (notably
 * Safari/iOS at the time of writing). Stops the camera and the decode
 * loop the instant one frame decodes, so a single scan can't fire
 * `onDecode` twice. See docs/ARCHITECTURE.md "Real camera scanner".
 */
export function QrScanner({ active, onDecode, onStatusChange }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<ScannerStatus>("requesting");

  useEffect(() => {
    onStatusChange?.(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!active) {
      // Syncs visible status to the `active` prop before the camera
      // setup/subscription below runs — the standard "sync on prop
      // change, then subscribe" effect shape.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("stopped");
      return;
    }

    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;
    let detector: {
      detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
    } | null = null;

    async function start() {
      setStatus("requesting");
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setStatus("denied");
        return;
      }
      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      setStatus("active");

      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => typeof detector;
        }
      ).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        try {
          detector = new BarcodeDetectorCtor({ formats: ["qr_code"] }) as typeof detector;
        } catch {
          detector = null;
        }
      }

      const canvas = canvasRef.current;
      const canvasCtx = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;

      const tick = async () => {
        if (cancelled || !videoRef.current) return;
        const video = videoRef.current;

        if (detector) {
          try {
            const results = await detector.detect(video);
            const value = results[0]?.rawValue;
            if (value) {
              onDecode(value);
              return;
            }
          } catch {
            // fall through to the next frame
          }
        } else if (canvas && canvasCtx && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(frame.data, frame.width, frame.height);
          if (decoded?.data) {
            onDecode(decoded.data);
            return;
          }
        }

        rafId = requestAnimationFrame(() => void tick());
      };

      rafId = requestAnimationFrame(() => void tick());
    }

    void start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="lua-qr-scanner">
      <video ref={videoRef} className="lua-qr-scanner__video" muted playsInline />
      <canvas ref={canvasRef} className="lua-qr-scanner__canvas" />
      <div className="lua-qr-scanner__frame" aria-hidden="true" />
      {status !== "active" ? (
        <div className="lua-qr-scanner__overlay">{statusLabel(status)}</div>
      ) : null}
    </div>
  );
}

function statusLabel(status: ScannerStatus): string {
  switch (status) {
    case "requesting":
      return "Запрашиваем доступ к камере…";
    case "denied":
      return "Нет доступа к камере. Разрешите доступ в настройках браузера.";
    case "unavailable":
      return "Камера недоступна на этом устройстве.";
    default:
      return "";
  }
}
