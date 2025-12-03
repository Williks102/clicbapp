'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';

export interface QrScannerProps {
  onScan: (data: string) => void;
  onError: (error: Error) => void;
  isScanning: boolean;
  fps?: number;
  qrbox?: number;
  aspectRatio?: number;
}

/**
 * Wrapper component pour html5-qrcode
 * API simple et compatible avec l'ancien scanner
 */
export function QrScanner({
  onScan,
  onError,
  isScanning,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1.0,
}: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const scannerId = 'qr-scanner-container';

    // Fonction pour démarrer le scanner
    const startScanner = async () => {
      try {
        console.log('[QR SCANNER] 🎬 Starting scanner...');

        // Créer l'instance du scanner si elle n'existe pas
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(scannerId);
        }

        // Configuration du scanner
        const config = {
          fps,
          qrbox,
          aspectRatio,
          // Préférer la caméra arrière sur mobile
          videoConstraints: {
            facingMode: { ideal: 'environment' }
          }
        };

        // Démarrer la caméra
        await scannerRef.current.start(
          { facingMode: 'environment' }, // Préférence pour caméra arrière
          config,
          (decodedText) => {
            console.log('[QR SCANNER] ✅ QR code detected:', decodedText.substring(0, 50));
            onScan(decodedText);
          },
          (errorMessage) => {
            // Ignorer les erreurs de "no QR code found" qui sont normales
            if (!errorMessage.includes('NotFoundException')) {
              console.warn('[QR SCANNER] ⚠️ Scan error:', errorMessage);
            }
          }
        );

        console.log('[QR SCANNER] ✅ Scanner started successfully');
        isInitializedRef.current = true;

      } catch (err) {
        console.error('[QR SCANNER] ❌ Failed to start scanner:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        onError(error);
        isInitializedRef.current = false;
      }
    };

    // Fonction pour arrêter le scanner
    const stopScanner = async () => {
      if (scannerRef.current && isInitializedRef.current) {
        try {
          console.log('[QR SCANNER] ⏹️ Stopping scanner...');
          await scannerRef.current.stop();
          console.log('[QR SCANNER] ✅ Scanner stopped');
          isInitializedRef.current = false;
        } catch (err) {
          console.error('[QR SCANNER] ❌ Error stopping scanner:', err);
        }
      }
    };

    // Démarrer ou arrêter selon l'état
    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }

    // Cleanup au démontage
    return () => {
      stopScanner();
    };
  }, [isScanning, onScan, onError, fps, qrbox, aspectRatio]);

  return (
    <div
      id="qr-scanner-container"
      ref={containerRef}
      className="qr-scanner-wrapper"
      style={{
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto'
      }}
    />
  );
}
