'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  declareWinner,
  deleteCompetition,
  setCompetitionStatus,
} from '@/app/actions/competition-actions';
import type { Candidate, CompetitionStatus } from '@/lib/types';

type CompetitionControlsProps = {
  competitionId: string;
  status: CompetitionStatus;
  candidates: Candidate[];
  winnerCandidateId?: string;
};

export function CompetitionControls({
  competitionId,
  status,
  candidates,
  winnerCandidateId,
}: CompetitionControlsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedWinner, setSelectedWinner] = useState(winnerCandidateId ?? '');

  const handleStatusChange = (next: string) => {
    startTransition(async () => {
      const result = await setCompetitionStatus(competitionId, next as CompetitionStatus);
      toast({
        title: result.success ? 'Statut mis à jour' : 'Erreur',
        description: result.success ? result.message : result.error,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) router.refresh();
    });
  };

  const handleDeclareWinner = () => {
    if (!selectedWinner) return;

    startTransition(async () => {
      const result = await declareWinner(competitionId, selectedWinner);
      toast({
        title: result.success ? 'Vainqueur publié' : 'Erreur',
        description: result.success ? result.message : result.error,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) router.refresh();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteCompetition(competitionId);

      if (result.success) {
        toast({ title: 'Concours supprimé' });
        router.push('/dashboard/competitions');
        router.refresh();
      } else {
        toast({
          title: 'Suppression impossible',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Statut du concours</label>
        <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Brouillon (privé)</SelectItem>
            <SelectItem value="published">Publié — votes fermés</SelectItem>
            <SelectItem value="voting">Votes ouverts</SelectItem>
            <SelectItem value="closed">Votes clôturés</SelectItem>
            <SelectItem value="finished">Terminé</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Les votes ne sont acceptés qu&apos;avec le statut « Votes ouverts » et dans
          la période définie.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Proclamer le vainqueur</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={selectedWinner}
            onValueChange={setSelectedWinner}
            disabled={isPending || candidates.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un candidat" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  N°{candidate.number} — {candidate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleDeclareWinner}
            disabled={isPending || !selectedWinner}
            className="shrink-0"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trophy className="mr-2 h-4 w-4" />
            )}
            Publier
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Publier le vainqueur clôture le concours et rend les scores publics.
        </p>
      </div>

      <div className="rounded-lg border border-destructive/30 p-4">
        <p className="font-medium text-destructive">Zone de danger</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La suppression retire le concours, ses candidats et son chat. Les
          commandes et les votes sont conservés pour la comptabilité.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="mt-3" disabled={isPending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer le concours
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce concours ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le concours et ses {candidates.length}{' '}
                candidat(s) seront définitivement supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
