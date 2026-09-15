import { useEffect, useState } from "react";
import QRCode from "qrcode";
import "./QrImage.css";

/**
 * A real, camera-decodable QR code (the `qrcode` package — proper
 * finder patterns, quiet zone, no decorative overlays) rendered from the
 * exact opaque token the server issued. See docs/QR-SECURITY.md.
 */
export function QrImage({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 480,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: "#251b16", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="lua-qr-image" role="img" aria-label="QR код">
      {dataUrl ? <img src={dataUrl} alt="QR код" /> : null}
    </div>
  );
}
