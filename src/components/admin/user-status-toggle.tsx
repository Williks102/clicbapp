'use client';

import { useState } from 'react';
import { Loader2, Ban, CheckCircle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateUserStatus } from '@/app/actions/admin-actions';
import { useRouter } from 'next/navigation';

interface UserStatusToggleProps {
  userId: string;
  userName: string;
  currentStatus: boolean; // true = disabled, false = active
  isDeleted: boolean;
}

export function UserStatusToggle({ 
  userId, 
  userName, 
  currentStatus,
  isDeleted 
}: UserStatusToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Si le compte est supprimé, ne pas permettre de modifications
  if (isDeleted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Compte supprimé
      </Button>
    );
  }

  const handleToggle = async () => {
    setIsUpdating(true);
    
    try {
      const newStatus = !currentStatus; // Inverser le statut
      const result = await updateUserStatus(userId, newStatus);
      
      if (result.success) {
        toast({
          title: newStatus ? 'Utilisateur désactivé' : 'Utilisateur activé',
          description: `Le compte de ${userName} a été ${newStatus ? 'désactivé' : 'activé'}.`,
        });
        setIsOpen(false);
        router.refresh(); // Rafraîchir la page
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Impossible de modifier le statut',
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
      setIsUpdating(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={currentStatus ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
        >
          {currentStatus ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Activer
            </>
          ) : (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Désactiver
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {currentStatus ? 'Activer' : 'Désactiver'} ce compte ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {currentStatus ? (
              <>
                Le compte de <strong>{userName}</strong> sera réactivé. 
                L'utilisateur pourra à nouveau se connecter et utiliser la plateforme.
              </>
            ) : (
              <>
                Le compte de <strong>{userName}</strong> sera désactivé. 
                L'utilisateur ne pourra plus se connecter jusqu'à réactivation.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggle}
            disabled={isUpdating}
            className={currentStatus ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStatus ? 'Activer' : 'Désactiver'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}