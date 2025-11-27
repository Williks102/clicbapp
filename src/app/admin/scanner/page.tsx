'use client';

import { useState, useMemo } from 'react';
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
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event } from '@/lib/types';

type ScanData = {
    eventId: string;
    ticketId: string;
    purchaseId: string;
    quantity: number;
    holder: string;
}

export default function AdminScannerPage() {
  const firestore = useFirestore();
  
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ScanData | null>(null);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'already_scanned' | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Base de données en mémoire des billets scannés
  const [scannedTickets, setScannedTickets] = useState<Set<string>>(new Set());

  // Charger tous les événements depuis Firestore
  const eventsQuery = useMemo(
    () => (firestore ? collection(firestore, 'events') : null),
    [firestore]
  );
  const { data: events } = useCollection<Event>(eventsQuery);

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      setIsScanning(false);
      setScanResult(data.text);
      try {
        const parsed = JSON.parse(data.text) as ScanData;
        const event = events?.find(e => e.id === parsed.eventId);
        const ticket = event?.tickets.find(t => t.id === parsed.ticketId);

        if (event && ticket && parsed.purchaseId) {
            setParsedData(parsed);
            if (scannedTickets.has(parsed.purchaseId)) {
                setValidationStatus('already_scanned');
            } else {
                setValidationStatus('valid');
                setScannedTickets(prev => new Set(prev).add(parsed.purchaseId));
            }
        } else {
            setParsedData(null);
            setValidationStatus('invalid');
        }
      } catch (e) {
        console.error('Erreur parsing QR code:', e);
        setParsedData(null);
        setValidationStatus('invalid');
      }
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
    setValidationStatus(null);
    setIsScanning(true);
  };

  const startScanning = () => {
    setScanResult(null);
    setParsedData(null);
    setScanError(null);
    setValidationStatus(null);
    setIsScanning(true);
  };
  
  const getEventName = (eventId: string) => events?.find(e => e.id === eventId)?.name || 'Événement inconnu';
  const getTicketName = (eventId: string, ticketId: string) => {
    const event = events?.find(e => e.id === eventId);
    return event?.tickets.find(t => t.id === ticketId)?.name || 'Type inconnu';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scanner de Billets (Admin)"
        description="Scannez et validez les billets pour n'importe quel événement de la plateforme."
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
          {scanResult && validationStatus && (
            <div className='w-full max-w-lg'>
              {/* Billet valide */}
              {validationStatus === 'valid' && parsedData && (
                <Alert variant="default" className="flex flex-col items-center text-center border-green-500 bg-green-50">
                  <CheckCircle className="mb-2 h-12 w-12 text-green-500" />
                  <AlertTitle className="mb-3 text-xl font-bold text-green-800">
                    Billet Valide ✅
                  </AlertTitle>
                  <AlertDescription className="w-full">
                    <div className='space-y-3 text-left bg-white rounded-lg p-4 text-green-900'>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Détenteur:</span>
                        <span className="font-medium">{parsedData.holder}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Événement:</span>
                        <span className="font-medium">{getEventName(parsedData.eventId)}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Type:</span>
                        <span className="font-medium">{getTicketName(parsedData.eventId, parsedData.ticketId)}</span>
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
                    <div className="mt-4 rounded-lg bg-green-100 p-3 text-green-800 border border-green-300">
                      <p className="font-semibold">✓ Le participant peut entrer</p>
                    </div>
                  </AlertDescription>
                  <Button onClick={handleReset} className="mt-6 w-full" size="lg">
                    Scanner un autre billet
                  </Button>
                </Alert>
              )}

              {/* Billet déjà scanné */}
              {validationStatus === 'already_scanned' && parsedData && (
                <Alert variant="destructive" className="flex flex-col items-center text-center">
                  <AlertTriangle className="mb-2 h-12 w-12 text-destructive" />
                  <AlertTitle className="mb-3 text-xl font-bold">
                    Billet Déjà Scanné ⚠️
                  </AlertTitle>
                  <AlertDescription className="w-full">
                    <div className='space-y-3 text-left bg-destructive/10 rounded-lg p-4'>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Détenteur:</span>
                        <span className="font-medium">{parsedData.holder}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Événement:</span>
                        <span className="font-medium">{getEventName(parsedData.eventId)}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">N° Commande:</span>
                        <span className="font-mono text-sm">{parsedData.purchaseId}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-destructive font-semibold">
                      ❌ Ce billet a déjà été validé et ne peut plus être utilisé.
                    </p>
                  </AlertDescription>
                  <Button onClick={handleReset} className="mt-6 w-full" size="lg" variant="destructive">
                    Scanner un autre billet
                  </Button>
                </Alert>
              )}

              {/* QR code invalide */}
              {validationStatus === 'invalid' && (
                <Alert variant="destructive" className="flex flex-col items-center text-center">
                  <XCircle className="mb-2 h-12 w-12 text-destructive" />
                  <AlertTitle className="mb-3 text-xl font-bold">
                    QR Code Invalide ❌
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-4">Ce QR code ne correspond pas à un billet valide dans la plateforme.</p>
                    {parsedData && (
                      <div className='space-y-2 text-left bg-destructive/10 rounded-lg p-4 text-sm'>
                        <p><span className="font-semibold">Événement:</span> {getEventName(parsedData.eventId)}</p>
                        <p className="text-xs text-muted-foreground">
                          L'événement ou le type de billet n'existe pas dans la base de données.
                        </p>
                      </div>
                    )}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Voir les données brutes
                      </summary>
                      <pre className="mt-2 rounded bg-muted p-2 text-xs w-full overflow-x-auto text-left">
                        <code>{scanResult}</code>
                      </pre>
                    </details>
                  </AlertDescription>
                  <Button onClick={handleReset} className="mt-6 w-full" size="lg" variant="destructive">
                    Scanner un autre billet
                  </Button>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}