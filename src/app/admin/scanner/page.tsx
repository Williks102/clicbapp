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
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import Link from 'next/link';
import { validateAndScanTicket } from '@/app/actions/scanner-actions';

type ScanData = {
    eventId: string;
    ticketId: string;
    saleId: string;
    quantity: number;
    holder: string;
}

export default function AdminScannerPage() {
  const firestore = useFirestore();
  
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ScanData | null>(null);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'already_scanned' | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Charger tous les événements depuis Firestore
  const eventsQuery = useMemo(
    () => (firestore ? collection(firestore, 'events') : null),
    [firestore]
  );
  const { data: events } = useCollection<Event>(eventsQuery);

  const handleScan = async (data: { text: string } | null) => {
    if (data) {
      setScanResult(data.text);
      setIsScanning(false);
      setIsValidating(true);

      try {
        const parsed = JSON.parse(data.text) as ScanData;
        setParsedData(parsed);

        // Appeler l'action serveur pour valider et enregistrer le scan
        const result = await validateAndScanTicket(data.text);

        if (result.success) {
          setValidationStatus('valid');
          setValidationMessage(result.message || 'Billet validé avec succès');
        } else {
          // Déterminer le type d'erreur
          if (result.error?.includes('déjà scanné')) {
            setValidationStatus('already_scanned');
            setValidationMessage(result.message || result.error);
          } else {
            setValidationStatus('invalid');
            setValidationMessage(result.error || 'Billet invalide');
          }
        }
      } catch (e) {
        console.error('Erreur parsing QR code:', e);
        setParsedData(null);
        setValidationStatus('invalid');
        setValidationMessage('QR code invalide');
      } finally {
        setIsValidating(false);
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
    setValidationMessage(null);
    setIsScanning(true);
  };

  const startScanning = () => {
    setScanResult(null);
    setParsedData(null);
    setScanError(null);
    setValidationStatus(null);
    setValidationMessage(null);
    setIsScanning(true);
  };
  
  const getEventName = (eventId: string) => events?.find(e => e.id === eventId)?.name || 'Événement inconnu';
  const getTicketName = (eventId: string, ticketId: string) => {
    const event = events?.find(e => e.id === eventId);
    return event?.tickets.find(t => t.id === ticketId)?.name || 'Type inconnu';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Scanner de Billets (Admin)"
          description="Scannez et validez les billets pour n'importe quel événement de la plateforme."
        />
        <Link href="/admin/scanner/stats">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Voir les Statistiques
          </Button>
        </Link>
      </div>

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

          {/* Indicateur de validation en cours */}
          {isValidating && (
            <Alert className="w-full max-w-sm">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              <AlertTitle>Validation en cours...</AlertTitle>
              <AlertDescription>Vérification du billet dans la base de données.</AlertDescription>
            </Alert>
          )}

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
                        <span className="font-mono text-sm">{parsedData.saleId}</span>
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
                        <span className="font-mono text-sm">{parsedData.saleId}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-destructive font-semibold">
                      ❌ {validationMessage || 'Ce billet a déjà été validé et ne peut plus être utilisé.'}
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
                    <p className="mb-4">{validationMessage || 'Ce QR code ne correspond pas à un billet valide dans la plateforme.'}</p>
                    {parsedData && (
                      <div className='space-y-2 text-left bg-destructive/10 rounded-lg p-4 text-sm'>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="font-semibold">Détenteur:</span>
                          <span>{parsedData.holder}</span>
                        </div>
                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <span className="font-semibold">N° Commande:</span>
                          <span className="font-mono text-xs">{parsedData.saleId}</span>
                        </div>
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