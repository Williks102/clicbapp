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
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { useSession } from 'next-auth/react';

type ScanData = {
    eventId: string;
    ticketId: string;
    purchaseId: string;
    quantity: number;
    holder: string;
}

export default function ScannerPage() {
  const { data: session } = useSession();
  const firestore = useFirestore();
  
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ScanData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'not_yours' | null>(null);
  
  // Fake database of scanned tickets (in-memory)
  const [scannedTickets, setScannedTickets] = useState<Set<string>>(new Set());

  // Charger les événements de l'organisateur depuis Firestore
  const myEventsQuery = useMemo(
    () => (firestore && session?.user?.id 
      ? query(collection(firestore, 'events'), where('organizerId', '==', session.user.id)) 
      : null),
    [firestore, session]
  );
  const { data: myEvents } = useCollection<Event>(myEventsQuery);

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      setScanResult(data.text);
      setIsScanning(false);
      
      try {
        const parsed = JSON.parse(data.text) as ScanData;
        
        // Vérifier que l'événement existe et appartient à l'organisateur
        const event = myEvents?.find(e => e.id === parsed.eventId);
        
        if (!event) {
          // L'événement n'appartient pas à cet organisateur
          setParsedData(parsed);
          setValidationStatus('not_yours');
          return;
        }

        const ticket = event.tickets.find(t => t.id === parsed.ticketId);

        if (event && ticket && parsed.purchaseId) {
          setParsedData(parsed);
          
          // Vérifier si déjà scanné
          if (scannedTickets.has(parsed.purchaseId)) {
            setValidationStatus('invalid');
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

  // Obtenir le nom de l'événement
  const getEventName = (eventId: string) => {
    return myEvents?.find(e => e.id === eventId)?.name || 'Événement inconnu';
  };

  // Obtenir le nom du ticket
  const getTicketName = (eventId: string, ticketId: string) => {
    const event = myEvents?.find(e => e.id === eventId);
    return event?.tickets.find(t => t.id === ticketId)?.name || 'Type inconnu';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scanner de Billets"
        description="Scannez les QR codes sur les billets pour valider les entrées à vos événements."
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
              {validationStatus === 'invalid' && parsedData && (
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

              {/* Billet ne vous appartient pas */}
              {validationStatus === 'not_yours' && parsedData && (
                <Alert variant="destructive" className="flex flex-col items-center text-center">
                  <XCircle className="mb-2 h-12 w-12 text-destructive" />
                  <AlertTitle className="mb-3 text-xl font-bold">
                    Événement Non Autorisé 🚫
                  </AlertTitle>
                  <AlertDescription className="w-full">
                    <p className="mb-4">Ce billet n'est pas pour l'un de vos événements.</p>
                    <div className='space-y-2 text-left bg-destructive/10 rounded-lg p-4 text-sm'>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Détenteur:</span>
                        <span>{parsedData.holder}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">N° Commande:</span>
                        <span className="font-mono text-xs">{parsedData.purchaseId}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-destructive font-semibold">
                      Vous ne pouvez scanner que les billets de vos propres événements.
                    </p>
                  </AlertDescription>
                  <Button onClick={handleReset} className="mt-6 w-full" size="lg" variant="destructive">
                    Scanner un autre billet
                  </Button>
                </Alert>
              )}

              {/* QR code invalide */}
              {!parsedData && validationStatus === 'invalid' && (
                <Alert variant="destructive" className="flex flex-col items-center text-center">
                  <XCircle className="mb-2 h-12 w-12 text-destructive" />
                  <AlertTitle className="mb-3 text-xl font-bold">
                    QR Code Invalide ❌
                  </AlertTitle>
                  <AlertDescription>
                    <p className="mb-4">Ce QR code ne correspond pas à un billet valide.</p>
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