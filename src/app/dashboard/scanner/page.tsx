'use client';

import { useState } from 'react';
import QrScanner from 'react-qr-scanner';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScanData = {
    eventId: string;
    ticketId: string;
    purchaseId: string;
    quantity: number;
    holder: string;
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ScanData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      setScanResult(data.text);
      try {
        const parsed = JSON.parse(data.text);
        if (parsed.eventId && parsed.ticketId && parsed.purchaseId) {
            setParsedData(parsed);
        } else {
            setParsedData(null);
        }
      } catch (e) {
        setParsedData(null);
      }
      setIsScanning(false);
    }
  };

  const handleError = (err: any) => {
    if (err.name === 'NotAllowedError') {
      setScanError(
        "L'accès à la caméra est requis pour scanner les billets. Veuillez autoriser l'accès dans les paramètres de votre navigateur."
      );
    } else {
      setScanError('Une erreur est survenue lors du scan. Veuillez réessayer.');
    }
    console.error(err);
    setIsScanning(false);
  };

  const handleReset = () => {
    setScanResult(null);
    setParsedData(null);
    setScanError(null);
    setIsScanning(true);
  };

  const startScanning = () => {
    setScanResult(null);
    setParsedData(null);
    setScanError(null);
    setIsScanning(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scanner de Billets"
        description="Scannez les QR codes sur les billets pour valider les entrées."
      />

      <Card>
        <CardHeader>
          <CardTitle>Scanner</CardTitle>
          <CardDescription>
            Pointez la caméra de votre appareil vers le QR code du billet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {/* Zone de scan */}
          <div className="w-full max-w-sm overflow-hidden rounded-lg border">
            {isScanning ? (
              <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                style={{ width: '100%' }}
                constraints={{
                    video: { facingMode: 'environment' }
                }}
              />
            ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-muted">
                    <Button onClick={startScanning}>Démarrer le Scan</Button>
                </div>
            )}
          </div>

          {/* Message d'erreur */}
          {scanError && (
             <Alert variant="destructive" className="w-full max-w-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur d'accès</AlertTitle>
                <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}

          {/* Résultat du scan */}
          {scanResult && (
            <div className='w-full max-w-lg'>
              <Alert
                variant={parsedData ? 'default' : 'destructive'}
                className="flex flex-col items-center text-center"
              >
                {parsedData ? (
                  <>
                    <CheckCircle className="mb-2 h-12 w-12 text-green-500" />
                    <AlertTitle className="mb-3 text-xl font-bold">
                      Billet Valide ✅
                    </AlertTitle>
                    <AlertDescription className="w-full">
                      <div className='space-y-3 text-left bg-secondary/50 rounded-lg p-4'>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="font-semibold">Détenteur:</span>
                          <span className="font-medium">{parsedData.holder}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="font-semibold">Quantité:</span>
                          <span className="font-medium">{parsedData.quantity} place(s)</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="font-semibold">N° Commande:</span>
                          <span className="font-mono text-sm">{parsedData.purchaseId}</span>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg bg-green-50 p-3 text-green-800 border border-green-200">
                        <p className="font-semibold">✓ Le participant peut entrer</p>
                      </div>
                      
                      {/* Données brutes (optionnel, pour debug) */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          Voir les données brutes
                        </summary>
                        <pre className="mt-2 rounded bg-muted p-2 text-xs w-full overflow-x-auto text-left">
                          <code>{scanResult}</code>
                        </pre>
                      </details>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="mb-2 h-12 w-12 text-destructive" />
                    <AlertTitle className="mb-3 text-xl font-bold">
                      Billet Invalide ❌
                    </AlertTitle>
                    <AlertDescription>
                      <p className="mb-4">Ce QR code ne correspond pas à un billet valide.</p>
                      <pre className="mt-2 rounded bg-muted p-2 text-xs w-full overflow-x-auto text-left">
                        <code>{scanResult}</code>
                      </pre>
                    </AlertDescription>
                  </>
                )}
                
                <Button onClick={handleReset} className="mt-6 w-full" size="lg">
                  Scanner un autre billet
                </Button>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}