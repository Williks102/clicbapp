

'use client';

import { useState, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { CloudinaryUploadWidget } from '@/components/cloudinary-upload-widget';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Wand2,
  Trash,
  PlusCircle,
  Video,
} from 'lucide-react';
import {
  generateEventDescription,
  GenerateEventDescriptionInput,
} from '@/ai/flows/event-description-generator';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { createEvent } from '@/app/actions/event-actions';
import { useCollection, useFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Category } from '@/lib/types';
import { Switch } from '@/components/ui/switch';


const ticketSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Le nom du billet est requis.'),
  price: z.coerce.number().min(0, 'Le prix doit être positif.'),
  quantity: z.coerce.number().int().min(1, 'La quantité doit être au moins 1.'),
});

const formSchema = z.object({
  eventName: z.string().min(3, 'Le nom de l\'événement est requis.'),
  eventCategory: z.string().min(1, 'La catégorie est requise.'),
  eventDate: z.string().min(1, 'La date est requise.'),
  eventLocation: z.string().min(1, 'Le lieu est requis.'),
  eventDescription: z.string().min(10, 'La description est trop courte.'),
  eventDescriptionKeywords: z
    .string()
    .optional(),
  tickets: z.array(ticketSchema).min(1, 'Au moins un type de billet est requis.'),
  image: z.string().url().optional(),
  livestreamEnabled: z.boolean().default(false),
  livestreamTitle: z.string().optional(),
  livestreamTicketPrice: z.coerce.number().optional(),
}).refine(data => {
    if (data.livestreamEnabled) {
        return !!data.livestreamTitle && data.livestreamTicketPrice !== undefined && data.livestreamTicketPrice >= 0;
    }
    return true;
}, {
    message: 'Le titre et le prix du livestream sont requis si le streaming est activé.',
    path: ['livestreamTitle'],
});


export type EventFormValues = z.infer<typeof formSchema>;

export default function CreateEventPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const { firestore, areServicesAvailable } = useFirebase();

  // Fetch categories from Firestore
  const categoriesQuery = useMemo(
    () => (areServicesAvailable ? collection(firestore, 'categories') : null),
    [areServicesAvailable, firestore]
  );
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: '',
      eventCategory: '',
      eventDate: '',
      eventLocation: '',
      image: '',
      eventDescription: '',
      tickets: [{ name: 'Standard', price: 10000, quantity: 100 }],
      livestreamEnabled: false,
      livestreamTitle: '',
      livestreamTicketPrice: 0
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tickets',
  });

  const livestreamEnabled = form.watch('livestreamEnabled');

  const handleGenerateDescription = async () => {
    const {
      eventName,
      eventCategory,
      eventDate,
      eventLocation,
      eventDescriptionKeywords,
    } = form.getValues();

    if (!eventName || !eventCategory || !eventDate || !eventLocation) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir le nom, la catégorie, la date et le lieu pour générer une description.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const input: GenerateEventDescriptionInput = {
        eventName,
        eventCategory,
        eventDate,
        eventLocation,
        eventDescriptionKeywords:
          eventDescriptionKeywords || 'vibrant, unique, inoubliable',
      };
      const result = await generateEventDescription(input);
      form.setValue('eventDescription', result.eventDescription, {
        shouldValidate: true,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur de génération',
        description: 'Impossible de générer la description.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  

  async function onSubmit(data: EventFormValues) {
    try {
      await createEvent(data);

      toast({
        title: 'Événement créé avec succès !',
        description: 'Votre événement a été soumis pour approbation.',
      });

      router.push('/dashboard/events');
    } catch (error) {
      console.error("Error creating event: ", error);
       toast({
        title: 'Erreur de création',
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la création de l'événement.",
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Créer un Nouvel Événement"
        description="Remplissez les informations ci-dessous pour mettre votre événement en ligne."
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">
                Détails de l'Événement
              </CardTitle>
              <CardDescription>
                Informations principales de votre événement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="eventName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'événement</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: FEMUA 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      {isLoadingCategories ? <Skeleton className="h-10 w-full" /> : (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                 <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date et heure</FormLabel>
                       <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="eventLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lieu</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Palais de la Culture, Abidjan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image de l'événement</FormLabel>
              <FormControl>
                <CloudinaryUploadWidget
                  value={field.value}
                  onChange={field.onChange}
                  onRemove={() => field.onChange('')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

              <FormField
                control={form.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={isGenerating}
                      >
                        <Wand2 className="mr-2 h-4 w-4" />
                        Générer avec l'IA
                      </Button>
                    </div>
                    <FormControl>
                        {isGenerating ? (
                            <div className='space-y-2'>
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : (
                            <Textarea
                                placeholder="Décrivez votre événement..."
                                className="min-h-[120px]"
                                {...field}
                            />
                        )}
                    </FormControl>
                     <FormDescription>
                       Pour la génération IA, vous pouvez ajouter des mots-clés ci-dessous.
                     </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventDescriptionKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mots-clés pour l'IA (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: festif, famille, en plein air" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Billetterie</CardTitle>
              <CardDescription>
                Configurez les différents types de billets pour votre événement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 items-start gap-4 rounded-md border p-4 md:grid-cols-4"
                >
                  <FormField
                    control={form.control}
                    name={`tickets.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          Nom du billet
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`tickets.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Prix (FCFA)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`tickets.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>
                            Quantité
                          </FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ name: '', price: 0, quantity: 50 })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un type de billet
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Streaming en Direct</CardTitle>
              <CardDescription>
                Proposez un accès en direct à votre événement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="livestreamEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Activer le streaming en direct
                      </FormLabel>
                      <FormDescription>
                        Permettez aux utilisateurs d'acheter un accès pour regarder l'événement en ligne.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {livestreamEnabled && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="livestreamTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre du direct</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Le Concert en Direct" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="livestreamTicketPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de l'accès (FCFA)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Création en cours...' : 'Créer l\'événement'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
