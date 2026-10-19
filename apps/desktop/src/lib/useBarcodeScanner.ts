import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Hook to capture hardware USB/Bluetooth HID Barcode Scanners.
 * Scanners emit keystrokes at very high speed (< 50ms between keys)
 * followed by an Enter key.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 4,
  maxIntervalMs = 50,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a textarea or input unless rapid
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key indicates end of barcode transmission
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          const scannedCode = bufferRef.current;
          bufferRef.current = '';
          // If rapid transmission, it's definitely a hardware scan
          onScan(scannedCode);
          if (isInputFocused) {
            e.preventDefault();
          }
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Single printable character
      if (e.key.length === 1) {
        // If interval is larger than typical human typing speed threshold, reset buffer
        if (interval > maxIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, minChars, maxIntervalMs, enabled]);
}
