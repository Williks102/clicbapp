'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle, Sparkles, Trash2 } from 'lucide-react';
import { checkLiveUrl } from '@/lib/live-url';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CloudinaryUploadWidget } from '@/components/cloudinary-upload-widget';
import { useToast } from '@/hooks/use-toast';
import { getCategories } from '@/app/actions/category-actions';
import {
  createCompetition,
  updateCompetition,
} from '@/app/actions/competition-actions';
import { generateCompetitionDescription } from '@/ai/flows/competition-description-generator';
import type { Category, Competition } from '@/lib/types';

const packSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Le nom du pack est requis.'),
  votes: z.coerce.number().int().min(1, 'Au moins 1 vote.'),
  price: z.coerce.number().min(1, 'Le prix doit être supérieur à 0.'),
  highlighted: z.boolean().default(false),
});

const formSchema = z
  .object({
    title: z.string().min(3, 'Le titre du concours est requis.'),
    category: z.string().min(1, 'La catégorie est requise.'),
    description: z.string().min(10, 'La description est trop courte.'),
    coverImage: z.string().optional(),
    votingStartsAt: z.string().min(1, "L'ouverture des votes est requise."),
    votingEndsAt: z.string().min(1, 'La clôture des votes est requise.'),
    status: z.enum(['draft', 'published', 'voting', 'closed', 'finished']),
    hideResults: z.boolean().default(false),
    votePacks: z.array(packSchema).min(1, 'Au moins un pack de votes est requis.'),
    freeVoteEnabled: z.boolean().default(true),
    freeVoteCooldownHours: z.coerce.number().int().min(1).max(720),
    liveEnabled: z.boolean().default(false),
    liveTitle: z.string().optional(),
    liveProvider: z.enum(['youtube', 'facebook', 'vimeo', 'hls', 'iframe']),
    liveUrl: z.string().optional(),
    liveScheduledAt: z.string().optional(),
    livePaid: z.boolean().default(false),
    livePrice: z.coerce.number().min(0),
    liveChatEnabled: z.boolean().default(true),
    liveReplayUrl: z.string().optional(),
  })
  .refine(
    (data) =>
      new Date(data.votingEndsAt).getTime() > new Date(data.votingStartsAt).getTime(),
    {
      message: 'La clôture doit être postérieure à l’ouverture des votes.',
      path: ['votingEndsAt'],
    }
  )
  .refine((data) => !data.liveEnabled || !!data.liveTitle, {
    message: 'Le titre du direct est requis.',
    path: ['liveTitle'],
  })
  .refine((data) => !data.liveEnabled || !data.livePaid || data.livePrice > 0, {
    message: "Indiquez un prix d'accès supérieur à 0.",
    path: ['livePrice'],
  })
  // Même contrôle que côté serveur, ici pour un retour immédiat à la saisie.
  // Le serveur revalide : ce contrôle est un confort, pas une garantie.
  .superRefine((data, ctx) => {
    for (const field of ['liveUrl', 'liveReplayUrl'] as const) {
      const check = checkLiveUrl(data.liveProvider, data[field] ?? '');
      if (!check.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: check.error, path: [field] });
      }
    }
  });

type CompetitionFormSchema = z.infer<typeof formSchema>;

/** Convertit une date ISO en valeur d'input `datetime-local`. */
function toLocalInput(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultDates() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return { start: toLocalInput(start.toISOString()), end: toLocalInput(end.toISOString()) };
}

type CompetitionFormProps = {
  /** Concours existant en mode édition. */
  competition?: Competition;
};

export function CompetitionForm({ competition }: CompetitionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keywords, setKeywords] = useState('');

  const dates = defaultDates();

  const form = useForm<CompetitionFormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: competition
      ? {
          title: competition.title,
          category: competition.category,
          description: competition.description,
          coverImage: competition.coverImage,
          votingStartsAt: toLocalInput(competition.votingStartsAt),
          votingEndsAt: toLocalInput(competition.votingEndsAt),
          status: competition.status,
          hideResults: competition.hideResults ?? false,
          votePacks: competition.votePacks?.map((pack) => ({
            id: pack.id,
            name: pack.name,
            votes: pack.votes,
            price: pack.price,
            highlighted: pack.highlighted ?? false,
          })) ?? [],
          freeVoteEnabled: competition.freeVote?.enabled ?? true,
          freeVoteCooldownHours: competition.freeVote?.cooldownHours ?? 24,
          liveEnabled: competition.live?.enabled ?? false,
          liveTitle: competition.live?.title ?? '',
          liveProvider: competition.live?.provider ?? 'youtube',
          liveUrl: competition.live?.url ?? '',
          liveScheduledAt: toLocalInput(competition.live?.scheduledAt),
          livePaid: competition.live?.paid ?? false,
          livePrice: competition.live?.price ?? 0,
          liveChatEnabled: competition.live?.chatEnabled ?? true,
          liveReplayUrl: competition.live?.replayUrl ?? '',
        }
      : {
          title: '',
          category: '',
          description: '',
          coverImage: '',
          votingStartsAt: dates.start,
          votingEndsAt: dates.end,
          status: 'draft',
          hideResults: false,
          votePacks: [
            { name: 'Pack Découverte', votes: 10, price: 500, highlighted: false },
            { name: 'Pack Supporter', votes: 50, price: 2000, highlighted: true },
            { name: 'Pack Champion', votes: 150, price: 5000, highlighted: false },
          ],
          freeVoteEnabled: true,
          freeVoteCooldownHours: 24,
          liveEnabled: false,
          liveTitle: '',
          liveProvider: 'youtube',
          liveUrl: '',
          liveScheduledAt: '',
          livePaid: false,
          livePrice: 0,
          liveChatEnabled: true,
          liveReplayUrl: '',
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'votePacks',
  });

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const liveEnabled = form.watch('liveEnabled');
  const livePaid = form.watch('livePaid');
  const freeVoteEnabled = form.watch('freeVoteEnabled');

  const handleGenerateDescription = async () => {
    const title = form.getValues('title');
    const category = form.getValues('category');

    if (!title || !category) {
      toast({
        title: 'Informations manquantes',
        description: 'Renseignez le titre et la catégorie avant de générer un texte.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateCompetitionDescription({
        title,
        category,
        votingEndsAt: form.getValues('votingEndsAt'),
        keywords: keywords || category,
        hasLive: form.getValues('liveEnabled'),
      });
      form.setValue('description', result.description, { shouldValidate: true });
      toast({ title: 'Présentation générée' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Génération impossible',
        description: "Le service d'IA n'a pas pu produire de texte.",
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  async function onSubmit(values: CompetitionFormSchema) {
    setIsSubmitting(true);

    try {
      const result = competition
        ? await updateCompetition(competition.id, values)
        : await createCompetition(values);

      if (!result.success) {
        throw new Error(result.error || 'Une erreur est survenue.');
      }

      toast({
        title: competition ? 'Concours mis à jour' : 'Concours créé',
        description: competition
          ? 'Vos modifications ont été enregistrées.'
          : 'Ajoutez maintenant vos candidats.',
      });

      const id = competition?.id ?? ('id' in result ? result.id : undefined);
      router.push(
        competition
          ? `/dashboard/competitions/${competition.id}`
          : id
            ? `/dashboard/competitions/${id}/candidates`
            : '/dashboard/competitions'
      );
      router.refresh();
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ---------- Informations générales ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du concours</CardTitle>
            <CardDescription>
              Ces éléments sont affichés sur la page publique du concours.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre du concours</FormLabel>
                  <FormControl>
                    <Input placeholder="Miss Côte d'Ivoire 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Brouillon (privé)</SelectItem>
                        <SelectItem value="published">
                          Publié (votes pas encore ouverts)
                        </SelectItem>
                        <SelectItem value="voting">Votes ouverts</SelectItem>
                        <SelectItem value="closed">Votes clôturés</SelectItem>
                        <SelectItem value="finished">Terminé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Présentation</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Présentez le concours, son déroulé et ses enjeux…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <FormLabel className="text-sm">Assistant de rédaction</FormLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                  placeholder="Mots-clés : élégance, finale à Abidjan, 20 candidates…"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Générer
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image de couverture</FormLabel>
                  <FormControl>
                    <CloudinaryUploadWidget
                      value={field.value}
                      onChange={field.onChange}
                      onRemove={() => field.onChange('')}
                      folder="competitions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ---------- Période de vote ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Période de vote</CardTitle>
            <CardDescription>
              Les votes ne sont acceptés que dans cette fenêtre, et uniquement si le
              statut est « Votes ouverts ».
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="votingStartsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ouverture des votes</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="votingEndsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clôture des votes</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hideResults"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 pr-4">
                    <FormLabel>Masquer les scores au public</FormLabel>
                    <FormDescription>
                      Le classement reste caché jusqu&apos;à la proclamation des
                      résultats.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ---------- Vote gratuit ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Vote gratuit</CardTitle>
            <CardDescription>
              Le vote gratuit attire du trafic ; les packs payants génèrent les revenus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="freeVoteEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 pr-4">
                    <FormLabel>Activer le vote gratuit</FormLabel>
                    <FormDescription>
                      Chaque membre connecté peut voter gratuitement à intervalle
                      régulier.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {freeVoteEnabled && (
              <FormField
                control={form.control}
                name="freeVoteCooldownHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai entre deux votes gratuits (heures)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={720} {...field} />
                    </FormControl>
                    <FormDescription>
                      24 h correspond à un vote gratuit par jour et par personne.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* ---------- Packs de votes ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Packs de votes</CardTitle>
            <CardDescription>
              Définissez les offres payantes proposées au public.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((pack, index) => (
              <div
                key={pack.id}
                className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
              >
                <FormField
                  control={form.control}
                  name={`votePacks.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Pack Supporter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`votePacks.${index}.votes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Votes</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`votePacks.${index}.price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix (F CFA)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name={`votePacks.${index}.highlighted`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center gap-1">
                        <FormLabel className="text-xs">Populaire</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Supprimer le pack</span>
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({ name: '', votes: 10, price: 500, highlighted: false })
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un pack
            </Button>

            {form.formState.errors.votePacks?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.votePacks.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ---------- Diffusion en direct ---------- */}
        <Card>
          <CardHeader>
            <CardTitle>Diffusion en direct</CardTitle>
            <CardDescription>
              Collez l&apos;URL de votre direct YouTube, Facebook, Vimeo ou de votre
              flux HLS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="liveEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5 pr-4">
                    <FormLabel>Activer la diffusion</FormLabel>
                    <FormDescription>
                      Une page dédiée au direct est créée pour ce concours.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {liveEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="liveTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre du direct</FormLabel>
                      <FormControl>
                        <Input placeholder="Grande finale — en direct" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="liveProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plateforme</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube Live</SelectItem>
                            <SelectItem value="facebook">Facebook Live</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                            <SelectItem value="hls">Flux HLS (.m3u8)</SelectItem>
                            <SelectItem value="iframe">Autre (iframe)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="liveScheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date annoncée du direct</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormDescription>
                          Affiche un compte à rebours avant la diffusion.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="liveUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL du direct</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://www.youtube.com/watch?v=…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="liveReplayUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de rediffusion (facultatif)</FormLabel>
                      <FormControl>
                        <Input placeholder="Lien du replay" {...field} />
                      </FormControl>
                      <FormDescription>
                        Diffusée automatiquement une fois le direct terminé.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="livePaid"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel>Direct payant</FormLabel>
                        <FormDescription>
                          L&apos;accès au direct est vendu séparément des votes.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {livePaid && (
                  <FormField
                    control={form.control}
                    name="livePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de l&apos;accès (F CFA)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="liveChatEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel>Chat en direct</FormLabel>
                        <FormDescription>
                          Les spectateurs peuvent échanger pendant la diffusion.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {competition ? 'Enregistrer les modifications' : 'Créer le concours'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  );
}
