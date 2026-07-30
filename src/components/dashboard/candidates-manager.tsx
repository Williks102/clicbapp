'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Pencil, PlusCircle, Trash2, UserMinus, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ImageUploader } from '@/components/image-uploader';
import { useToast } from '@/hooks/use-toast';
import {
  createCandidate,
  deleteCandidate,
  setCandidateEliminated,
  updateCandidate,
} from '@/app/actions/candidate-actions';
import { formatVotes } from '@/lib/utils';
import type { Candidate } from '@/lib/types';

const FALLBACK_PHOTO = 'https://placehold.co/200x200/1f2937/ffffff?text=%20';

const candidateSchema = z.object({
  name: z.string().min(2, 'Le nom du candidat est requis.'),
  number: z.coerce.number().int().min(1, 'Le dossard doit être supérieur à 0.'),
  photo: z.string().optional(),
  bio: z.string().max(1000, 'La biographie est trop longue.').optional(),
  city: z.string().optional(),
});

type CandidateFormSchema = z.infer<typeof candidateSchema>;

type CandidatesManagerProps = {
  competitionId: string;
  candidates: Candidate[];
};

export function CandidatesManager({
  competitionId,
  candidates,
}: CandidatesManagerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);

  const nextNumber =
    candidates.reduce((max, candidate) => Math.max(max, candidate.number), 0) + 1;

  const form = useForm<CandidateFormSchema>({
    resolver: zodResolver(candidateSchema),
    defaultValues: { name: '', number: nextNumber, photo: '', bio: '', city: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', number: nextNumber, photo: '', bio: '', city: '' });
    setIsDialogOpen(true);
  };

  const openEdit = (candidate: Candidate) => {
    setEditing(candidate);
    form.reset({
      name: candidate.name,
      number: candidate.number,
      photo: candidate.photo,
      bio: candidate.bio,
      city: candidate.city ?? '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: CandidateFormSchema) => {
    startTransition(async () => {
      const result = editing
        ? await updateCandidate(editing.id, values)
        : await createCandidate(competitionId, values);

      if (result.success) {
        toast({
          title: editing ? 'Candidat mis à jour' : 'Candidat ajouté',
        });
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  const toggleEliminated = (candidate: Candidate) => {
    startTransition(async () => {
      const result = await setCandidateEliminated(candidate.id, !candidate.eliminated);
      toast({
        title: result.success ? result.message : 'Erreur',
        description: result.success ? undefined : result.error,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) router.refresh();
    });
  };

  const handleDelete = (candidate: Candidate) => {
    startTransition(async () => {
      const result = await deleteCandidate(candidate.id);
      toast({
        title: result.success ? 'Candidat supprimé' : 'Suppression impossible',
        description: result.success ? undefined : result.error,
        variant: result.success ? undefined : 'destructive',
      });
      if (result.success) router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-3">
        <CardTitle className="text-lg">
          Candidats ({candidates.length})
        </CardTitle>
        <Button onClick={openCreate} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un candidat
        </Button>
      </CardHeader>

      <CardContent>
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">
              Aucun candidat pour l&apos;instant. Ajoutez-les pour ouvrir les votes.
            </p>
            <Button onClick={openCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter le premier candidat
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={candidate.photo || FALLBACK_PHOTO}
                    alt={candidate.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{candidate.name}</p>
                    {candidate.eliminated && (
                      <Badge variant="destructive" className="shrink-0">
                        Éliminé
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    N°{candidate.number} · {formatVotes(candidate.voteCount)} votes
                    {candidate.city ? ` · ${candidate.city}` : ''}
                  </p>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Modifier"
                    onClick={() => openEdit(candidate)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title={candidate.eliminated ? 'Réintégrer' : 'Éliminer'}
                    onClick={() => toggleEliminated(candidate)}
                    disabled={isPending}
                  >
                    {candidate.eliminated ? (
                      <UserPlus className="h-4 w-4" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        title="Supprimer"
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Supprimer {candidate.name} ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Un candidat ayant reçu des votes payants ne peut pas être
                          supprimé : éliminez-le plutôt du concours.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(candidate)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier le candidat' : 'Nouveau candidat'}
            </DialogTitle>
            <DialogDescription>
              Le dossard identifie le candidat auprès du public.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Aya Konan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dossard</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville / région (facultatif)</FormLabel>
                    <FormControl>
                      <Input placeholder="Abidjan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Présentation</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Parcours, motivations, ambitions…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo</FormLabel>
                    <FormControl>
                      <ImageUploader
                        value={field.value}
                        onChange={field.onChange}
                        onRemove={() => field.onChange('')}
                        folder="candidates"
                        aspect="square"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Enregistrer' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
