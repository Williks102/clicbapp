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
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/data';

type ScanData = {
    eventId: string;
    ticketId: string;
    purchaseId: string;
    quantity: number;
    holder: string;
}

export default function AdminScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ScanData | null>(null);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'already_scanned' | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Fake database of scanned tickets
  const [scannedTickets, setScannedTickets] = useState<Set<string>>(new Set());

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      setIsScanning(false);
      setScanResult(data.text);
      try {
        const parsed = JSON.parse(data.text) as ScanData;
        const event = events.find(e => e.id === parsed.eventId);
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
  
  const getEventName = (eventId: string) => events.find(e => e.id === eventId)?.name || 'Inconnu';
  const getTicketName = (eventId: string, ticketId: string) => events.find(e => e.id === eventId)?.tickets.find(t => t.id === ticketId)?.name || 'Inconnu';


  const ResultAlert = () => {
    if (!validationStatus || !parsedData) {
        if (validationStatus === 'invalid') {
             return (
                <Alert variant="destructive" className="flex flex-col items-center text-center">
                    <XCircle className="mb-2 h-12 w-12 text-destructive" />
                    <AlertTitle className="mb-1 text-xl font-bold">Billet Invalide</AlertTitle>
                    <AlertDescription>
                        Ce QR code n'est pas reconnu par le système.
                        <pre className="mt-2 rounded bg-muted p-2 text-xs w-full overflow-x-auto text-left">
                            <code>{scanResult}</code>
                        </pre>
                    </AlertDescription>
                </Alert>
             )
        }
        return null;
    }

    const alertVariant = validationStatus === 'valid' ? 'default' : (validationStatus === 'already_scanned' ? 'destructive' : 'destructive');
    const Icon = validationStatus === 'valid' ? CheckCircle : (validationStatus === 'already_scanned' ? AlertTriangle : XCircle);
    const title = validationStatus === 'valid' ? 'Billet Valide' : (validationStatus === 'already_scanned' ? 'Déjà Scanné' : 'Billet Invalide');
    const iconColor = validationStatus === 'valid' ? 'text-green-500' : 'text-destructive';
    
    return (
        <Alert variant={alertVariant} className="flex flex-col items-center text-center">
            <Icon className={`mb-2 h-12 w-12 ${iconColor}`} />
            <AlertTitle className="mb-1 text-xl font-bold">{title}</AlertTitle>
            <AlertDescription className="w-full">
                <div className='text-sm text-left w-full space-y-1 mb-4'>
                    <p><strong>Détenteur:</strong> {parsedData.holder}</p>
                    <p><strong>Événement:</strong> {getEventName(parsedData.eventId)}</p>
                    <p><strong>Type Billet:</strong> {getTicketName(parsedData.eventId, parsedData.ticketId)} (x{parsedData.quantity})</p>
                </div>
                {validationStatus === 'already_scanned' && <p>Ce billet a déjà été validé et ne peut plus être utilisé.</p>}
                {validationStatus === 'valid' && <p>Le participant peut entrer.</p>}
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Scanner de Billets (Admin)"
        description="Scannez et validez les billets pour n'importe quel événement."
      />

      <Card>
        <CardHeader>
          <CardTitle>Scanner</CardTitle>
          <CardDescription>
            Pointez la caméra de votre appareil vers le QR code du billet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
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
                    {!scanResult && <Button onClick={startScanning}>Démarrer le Scan</Button>}
                    {scanResult && (
                        <div className="w-full max-w-sm p-4 space-y-4">
                           <ResultAlert />
                           <Button onClick={handleReset} className="w-full">
                             Scanner un autre billet
                           </Button>
                        </div>
                    )}
                </div>
            )}
          </div>

          {scanError && (
             <Alert variant="destructive" className="w-full max-w-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur de la caméra</AlertTitle>
                <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
