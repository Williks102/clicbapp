'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Keyboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { validateAndScanTicket } from '@/app/actions/scanner-actions';
import { useScannerSounds } from '@/hooks/use-scanner-sounds';

type ScanData = {
    eventId: string;
    ticketId: string;
    saleId: string;
    quantity: number;
    holder: string;
}

export default function ScannerPage() {
  const { data: session } = useSession();
  const firestore = useFirestore();
  const { playSound } = useScannerSounds();

  const [scanResult, setScanResult] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ScanData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'not_yours' | 'already_scanned' | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');

  // Charger les événements de l'organisateur depuis Firestore
  const myEventsQuery = useMemo(
    () => (firestore && session?.user?.id
      ? query(collection(firestore, 'events'), where('organizerId', '==', session.user.id))
      : null),
    [firestore, session]
  );
  const { data: myEvents } = useCollection<Event>(myEventsQuery);

  // Jouer un son quand le statut de validation change
  useEffect(() => {
    if (validationStatus === 'valid') {
      playSound('success');
    } else if (validationStatus && validationStatus !== 'valid') {
      playSound('error');
    }
  }, [validationStatus, playSound]);

  const handleScan = async (data: { text: string } | null) => {
    console.log('[SCANNER] 📸 handleScan called with data:', data);

    if (data) {
      console.log('[SCANNER] ✅ Data received:', data.text);
      setScanResult(data.text);
      setIsScanning(false);
      setIsValidating(true);
      console.log('[SCANNER] 🔄 Starting validation...');

      try {
        console.log('[SCANNER] 🔍 Parsing QR code data...');
        const parsed = JSON.parse(data.text) as ScanData;
        console.log('[SCANNER] ✅ Parsed data:', parsed);
        setParsedData(parsed);

        // Vérifier que l'événement existe et appartient à l'organisateur
        console.log('[SCANNER] 🔍 Checking if event belongs to organizer...');
        console.log('[SCANNER] Event ID to find:', parsed.eventId);
        console.log('[SCANNER] My events:', myEvents?.map(e => ({ id: e.id, name: e.name })));
        const event = myEvents?.find(e => e.id === parsed.eventId);

        if (!event) {
          // L'événement n'appartient pas à cet organisateur
          console.log('[SCANNER] ❌ Event not found or not yours');
          setValidationStatus('not_yours');
          setIsValidating(false);
          return;
        }

        console.log('[SCANNER] ✅ Event found:', event.name);
        console.log('[SCANNER] 📡 Calling server action validateAndScanTicket...');

        // Appeler l'action serveur pour valider et enregistrer le scan
        const result = await validateAndScanTicket(data.text);
        console.log('[SCANNER] 📡 Server response:', result);

        if (result.success) {
          console.log('[SCANNER] ✅ Validation successful!');
          setValidationStatus('valid');
          setValidationMessage(result.message || 'Billet validé avec succès');

          // Mettre à jour parsedData avec les infos complètes du serveur
          if (result.scanData) {
            setParsedData({
              eventId: result.scanData.eventId,
              ticketId: result.scanData.ticketId,
              saleId: parsed.saleId,
              quantity: result.scanData.quantity,
              holder: result.scanData.holderName
            });
          }
        } else {
          console.log('[SCANNER] ❌ Validation failed:', result.error);

          // Mettre à jour parsedData pour afficher les infos même en cas d'erreur
          if (result.scanData) {
            setParsedData({
              eventId: result.scanData.eventId,
              ticketId: result.scanData.ticketId,
              saleId: parsed.saleId,
              quantity: result.scanData.quantity,
              holder: result.scanData.holderName
            });
          }

          // Déterminer le type d'erreur
          if (result.error?.includes('déjà scanné')) {
            console.log('[SCANNER] Error type: already_scanned');
            setValidationStatus('already_scanned');
            setValidationMessage(result.message || result.error);
          } else if (result.error?.includes('autorisé')) {
            console.log('[SCANNER] Error type: not_yours');
            setValidationStatus('not_yours');
            setValidationMessage(result.error);
          } else {
            console.log('[SCANNER] Error type: invalid');
            setValidationStatus('invalid');
            setValidationMessage(result.error || 'Billet invalide');
          }
        }
      } catch (e) {
        console.error('[SCANNER] ❌ Error parsing QR code:', e);
        setParsedData(null);
        setValidationStatus('invalid');
        setValidationMessage('QR code invalide');
      } finally {
        console.log('[SCANNER] 🏁 Validation complete, isValidating=false');
        setIsValidating(false);
      }
    } else {
      console.log('[SCANNER] ⚠️ handleScan called with null/undefined data');
    }
  };

  const handleError = (err: any) => {
    console.error('[SCANNER] 🚨 Scanner error occurred:', err);
    console.error('[SCANNER] Error name:', err.name);
    console.error('[SCANNER] Error message:', err.message);

    if (err.name === 'NotAllowedError') {
      console.log('[SCANNER] ❌ Camera access denied');
      setScanError(
        "L'accès à la caméra est requis pour scanner les billets. Veuillez autoriser l'accès dans les paramètres de votre navigateur."
      );
    } else if (err.name === 'NotFoundError') {
      console.log('[SCANNER] ❌ No camera found on device');
      setScanError(
        "Aucune caméra détectée sur cet appareil. Utilisez l'onglet 'Saisie Manuelle' pour entrer le numéro de billet."
      );
    } else if (err.name === 'NotReadableError') {
      console.log('[SCANNER] ❌ Camera not readable (may be in use)');
      setScanError(
        "La caméra est peut-être utilisée par une autre application. Fermez les autres applications utilisant la caméra et réessayez."
      );
    } else {
      console.log('[SCANNER] ❌ Other scanner error:', err.name);
      setScanError('Une erreur est survenue lors du scan. Utilisez la saisie manuelle pour continuer.');
    }
    console.log('[SCANNER] ⏹️ Stopping scanner, isScanning=false');
    setIsScanning(false);
  };

  const handleReset = () => {
    console.log('[SCANNER] 🔄 Resetting scanner and restarting...');
    setScanResult(null);
    setParsedData(null);
    setScanError(null);
    setValidationStatus(null);
    setValidationMessage(null);
    setIsScanning(true);
    console.log('[SCANNER] ✅ Scanner reset and restarted, isScanning=true');
  };

  const startScanning = () => {
    console.log('[SCANNER] 🎬 Starting scanner...');
    console.log('[SCANNER] Reset states');
    setScanResult(null);
    setParsedData(null);
    setScanError(null);
    setValidationStatus(null);
    setValidationMessage(null);
    setIsScanning(true);
    console.log('[SCANNER] ✅ Scanner started, isScanning=true');
  };

  const handleManualValidation = async () => {
    console.log('[MANUAL] ⌨️ Manual validation triggered');
    console.log('[MANUAL] Manual input:', manualCode);

    if (!manualCode.trim()) {
      console.log('[MANUAL] ❌ Empty manual code');
      setScanError('Veuillez entrer un ID de vente');
      return;
    }

    setScanError(null);
    setIsValidating(true);
    console.log('[MANUAL] 🔄 Starting manual validation...');

    try {
      // Essayer de parser en JSON si ça ressemble à du JSON
      let qrData: string;
      if (manualCode.trim().startsWith('{')) {
        console.log('[MANUAL] 🔍 Detected JSON format, parsing...');
        const parsed = JSON.parse(manualCode) as ScanData;
        console.log('[MANUAL] ✅ Parsed JSON data:', parsed);
        setParsedData(parsed);
        qrData = manualCode;
      } else {
        // Sinon, traiter comme un ID de vente simple
        console.log('[MANUAL] 🔍 Detected sale ID format:', manualCode.trim());
        // Chercher la vente dans Firestore pour récupérer les infos complètes
        // On passe l'ID directement, le serveur fera la recherche
        qrData = manualCode.trim();
      }

      console.log('[MANUAL] 📡 Calling server action validateAndScanTicket...');

      // Appeler l'action serveur pour valider et enregistrer le scan
      const result = await validateAndScanTicket(qrData);
      console.log('[MANUAL] 📡 Server response:', result);

      if (result.success) {
        console.log('[MANUAL] ✅ Validation successful!');

        // ✅ Définir scanResult pour afficher le résultat visuel
        setScanResult(qrData);
        setValidationStatus('valid');
        setValidationMessage(result.message || 'Billet validé avec succès');
        setManualCode(''); // Réinitialiser le champ
        console.log('[MANUAL] Manual code cleared');

        // Mettre à jour parsedData avec les infos complètes retournées du serveur
        if (result.scanData) {
          setParsedData({
            eventId: result.scanData.eventId,
            ticketId: result.scanData.ticketId,
            saleId: qrData,
            quantity: result.scanData.quantity,
            holder: result.scanData.holderName
          });
        }
      } else {
        console.log('[MANUAL] ❌ Validation failed:', result.error);

        // ✅ Définir scanResult pour afficher les erreurs visuellement aussi
        setScanResult(qrData);

        // Déterminer le type d'erreur
        if (result.error?.includes('déjà scanné')) {
          console.log('[MANUAL] Error type: already_scanned');
          setValidationStatus('already_scanned');
          setValidationMessage(result.message || result.error);
        } else if (result.error?.includes('autorisé')) {
          console.log('[MANUAL] Error type: not_yours');
          setValidationStatus('not_yours');
          setValidationMessage(result.error);
        } else {
          console.log('[MANUAL] Error type: invalid');
          setValidationStatus('invalid');
          setValidationMessage(result.error || 'Billet invalide');
        }

        // Mettre les données complètes pour l'affichage des erreurs
        if (result.scanData) {
          setParsedData({
            eventId: result.scanData.eventId,
            ticketId: result.scanData.ticketId,
            saleId: qrData,
            quantity: result.scanData.quantity || 0,
            holder: result.scanData.holderName || 'Inconnu'
          });
        }
      }
    } catch (e) {
      console.error('[MANUAL] ❌ Error processing manual input:', e);
      setParsedData(null);
      setValidationStatus('invalid');
      setValidationMessage('Format de code invalide');
    } finally {
      console.log('[MANUAL] 🏁 Manual validation complete, isValidating=false');
      setIsValidating(false);
    }
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
      <div className="flex items-center justify-between">
        <PageHeader
          title="Scanner de Billets"
          description="Scannez les QR codes sur les billets pour valider les entrées à vos événements."
        />
        <Link href="/dashboard/scanner/stats">
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
            Scannez avec la caméra ou saisissez le code manuellement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera">Caméra</TabsTrigger>
              <TabsTrigger value="manual">
                <Keyboard className="mr-2 h-4 w-4" />
                Saisie Manuelle
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="flex flex-col items-center gap-6 mt-6">
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
            </TabsContent>

            <TabsContent value="manual" className="flex flex-col items-center gap-6 mt-6">
              <div className="w-full max-w-sm space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-code">Numéro de billet ou Code QR</Label>
                  <Input
                    id="manual-code"
                    placeholder='Exemple: TKT-ABC123 ou ORD-XYZ789'
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Entrez le <strong>N° de Billet</strong> (TKT-...), le N° de Commande (ORD-...) ou le JSON complet
                  </p>
                </div>
                <Button
                  onClick={handleManualValidation}
                  disabled={isValidating || !manualCode.trim()}
                  className="w-full"
                >
                  {isValidating ? 'Validation...' : 'Valider le Billet'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

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

              {/* Billet invalide */}
              {validationStatus === 'invalid' && parsedData && (
                <Alert variant="destructive" className="flex flex-col items-center text-center">
                  <XCircle className="mb-2 h-12 w-12 text-destructive" />
                  <AlertTitle className="mb-3 text-xl font-bold">
                    Billet Invalide ❌
                  </AlertTitle>
                  <AlertDescription className="w-full">
                    <p className="mb-4">{validationMessage || 'Ce billet est invalide.'}</p>
                    <div className='space-y-3 text-left bg-destructive/10 rounded-lg p-4'>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">Détenteur:</span>
                        <span className="font-medium">{parsedData.holder}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="font-semibold">N° Commande:</span>
                        <span className="font-mono text-sm">{parsedData.saleId}</span>
                      </div>
                    </div>
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
                        <span className="font-mono text-xs">{parsedData.saleId}</span>
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