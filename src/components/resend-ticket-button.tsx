'use client';

import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resendTicketEmail } from '@/app/actions/ticket-actions';

type ResendTicketButtonProps = {
  saleId: string;
  email: string;
};

export function ResendTicketButton({ saleId, email }: ResendTicketButtonProps) {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    setIsResending(true);

    try {
      const result = await resendTicketEmail(saleId);

      if (result.success) {
        toast({
          title: 'Email renvoyé !',
          description: `Le billet a été renvoyé à ${email}`,
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={isResending}
    >
      {isResending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Envoi en cours...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Renvoyer le billet
        </>
      )}
    </Button>
  );
}