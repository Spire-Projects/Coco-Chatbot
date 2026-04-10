import { useEffect, useRef, useState, memo } from 'react';
import QRCode from 'qrcode';

interface QrCodeDisplayProps {
  value: string;
  /** Rendered size in pixels (default 160) */
  size?: number;
  /** Label shown below the QR image */
  label?: string;
}

/**
 * Renders a QR code image for the given `value` string using the `qrcode` library.
 * Displays the short code as a label below the image for easy reference.
 */
const QrCodeDisplayComponent = ({ value, size = 160, label }: QrCodeDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    setError(false);
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => setError(true));
  }, [value, size]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded border border-dashed border-gray-300 text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        Error QR
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      {label && (
        <span className="text-xs font-mono text-muted-foreground tracking-widest">
          {label}
        </span>
      )}
    </div>
  );
};

export const QrCodeDisplay = memo(QrCodeDisplayComponent);
