'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Event, TicketTier } from '@/lib/types';
import { Download, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

type ElectronicTicketProps = {
  event: Event;
  ticket: TicketTier;
  quantity: number;
  fullName: string;
  orderId?: string;
  ticketNumber?: string;
};

export default function ElectronicTicket({
  event,
  ticket,
  quantity,
  fullName,
  orderId = 'ord-12345',
  ticketNumber = 'TKT-67890'
}: ElectronicTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const isExternalImage = event.image.startsWith('http');
  const image = isExternalImage ? { imageUrl: event.image, imageHint: 'event image' } : PlaceHolderImages.find((img) => img.id === event.image);

  const qrCodeData = JSON.stringify({
    eventId: event.id,
    ticketId: ticket.id,
    purchaseId: orderId,
    ticketNumber: ticketNumber,
    quantity: quantity,
    holder: fullName,
  });

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrCodeData, {
        width: 150,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
      });
    }
  }, [qrCodeData]);
  
  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);

    try {
        const canvas = await html2canvas(ticketRef.current, {
            scale: 2,
            useCORS: true, // Important for external images
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            // Set format to the same dimensions as the captured canvas
            format: [canvas.width, canvas.height]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`billet-${event.name.replace(/\s+/g, '-')}-${ticketNumber}.pdf`);

        toast({
          title: 'Téléchargement réussi',
          description: 'Votre billet a été téléchargé au format PDF.',
        });

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            title: 'Erreur de téléchargement',
            description: 'Impossible de générer le fichier PDF du billet.',
            variant: 'destructive',
        });
    } finally {
        setIsDownloading(false);
    }
  };


  return (
    <div>
        <div ref={ticketRef} className="rounded-lg border-2 border-dashed bg-background shadow-lg">
          <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
            {image && (
              <Image
                src={image.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
                data-ai-hint={image.imageHint}
                crossOrigin="anonymous" // This is crucial for html2canvas
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className='absolute bottom-4 left-4'>
                <h3 className="font-headline text-2xl font-bold text-white shadow-md">{event.name}</h3>
            </div>
          </div>
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 p-6">
               <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className='font-semibold text-muted-foreground'>Détenteur</span>
                        <span className='font-medium'>{fullName}</span>
                    </div>
                     <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className='font-semibold text-muted-foreground'>Billet</span>
                        <span className='font-medium'>{ticket.name} (x{quantity})</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className='font-semibold text-muted-foreground'>Date</span>
                        <span className='font-medium'>{new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className='font-semibold text-muted-foreground'>Lieu</span>
                        <span className='font-medium'>{event.location}</span>
                    </div>
                    <Separator className="my-2" />
                     <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className='font-semibold text-muted-foreground'>N° de Commande</span>
                        <span className='font-mono text-xs font-medium'>{orderId}</span>
                    </div>
                     <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className='font-semibold text-muted-foreground'>N° de Billet</span>
                        <span className='font-mono text-xs font-medium'>{ticketNumber}</span>
                    </div>
                </div>
                 <Separator className="my-4" />
                 <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-yellow-800 border border-yellow-200">
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">
                        <strong>Attention :</strong> Ce billet est personnel et non-transférable. Ne partagez pas le QR code.
                    </p>
                 </div>
            </div>
            <div className="flex items-center justify-center p-6 md:border-l-2 md:border-dashed">
                 <div className="flex flex-col items-center">
                    <div className="rounded-lg bg-white p-2 shadow-md">
                        <canvas ref={canvasRef} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Scannez à l'entrée</p>
                </div>
            </div>
          </div>
        </div>
         <div className="mt-6 text-center">
            <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloading ? 'Téléchargement...' : 'Télécharger le billet (PDF)'}
            </Button>
        </div>
    </div>
  );
}
