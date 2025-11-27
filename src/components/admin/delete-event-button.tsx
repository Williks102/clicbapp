'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteEvent } from '@/app/actions/admin-actions';
import { useRouter } from 'next/navigation';

interface DeleteEventButtonProps {
  eventId: string;
  eventName: string;
}

export function DeleteEventButton({ eventId, eventName }: DeleteEventButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteEvent(eventId);
      
      if (result.success) {
        toast({
          title: 'Événement supprimé',
          description: `${eventName} a été supprimé avec succès.`,
        });
        setIsOpen(false);
        router.refresh(); // Rafraîchir la page pour mettre à jour la liste
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de supprimer l\'événement',
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
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button className="flex w-full items-center px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L'événement "{eventName}" sera définitivement supprimé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}