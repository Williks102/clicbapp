'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import {
  Wand2,
  Trash,
  PlusCircle,
  Loader2,
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
import { categories } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { updateEvent } from '@/app/actions/event-actions';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CloudinaryUploadWidget } from '@/components/cloudinary-upload-widget'; // ✅ Import Cloudinary

// ==================== SCHEMAS ====================

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
  eventDescriptionKeywords: z.string().optional(),
  tickets: z.array(ticketSchema).min(1, 'Au moins un type de billet est requis.'),
  image: z.string().url().optional(), // ✅ URL Cloudinary
});

export type EventFormValues = z.infer<typeof formSchema>;

// ==================== COMPONENT ====================

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const firestore = useFirestore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  // ✅ Plus besoin de imagePreview ni fileInputRef !

  // Charger l'événement depuis Firestore
  const eventRef = useMemo(
    () => (firestore && eventId ? doc(firestore, `events/${eventId}`) : null),
    [firestore, eventId]
  );
  const { data: event, isLoading } = useDoc<Event>(eventRef);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: '',
      eventCategory: '',
      eventDate: '',
      eventLocation: '',
      eventDescription: '',
      tickets: [{ name: 'Standard', price: 10000, quantity: 100 }],
      image: '', // ✅ URL Cloudinary
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tickets',
  });

  // ✅ Initialiser le formulaire avec les données de l'événement
  useEffect(() => {
    if (event) {
      // Déterminer l'URL de l'image
      let imageUrl = event.image;
      
      // Si c'est un placeholder ID, convertir en URL
      if (event.image && !event.image.startsWith('http')) {
        const placeholderImage = PlaceHolderImages.find(img => img.id === event.image);
        if (placeholderImage) {
          imageUrl = placeholderImage.imageUrl;
        }
      }
      
      // Initialiser le formulaire
      form.reset({
        eventName: event.name,
        eventCategory: event.category,
        eventDate: new Date(event.date).toISOString().split('T')[0],
        eventLocation: event.location,
        eventDescription: event.description,
        eventDescriptionKeywords: '',
        tickets: event.tickets,
        image: imageUrl, // ✅ CloudinaryUploadWidget affichera le preview
      });
    }
  }, [event, form]);

  // Génération de description IA
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
        description: 'Veuillez remplir le nom, la catégorie, la date et le lieu.',
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
        eventDescriptionKeywords: eventDescriptionKeywords || 'vibrant, unique, inoubliable',
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

  // ✅ Soumission du formulaire (plus de formData !)
  async function onSubmit(data: EventFormValues) {
    try {
      await updateEvent(eventId, data); // ✅ Plus de formData

      toast({
        title: 'Événement mis à jour !',
        description: 'Les modifications ont été enregistrées.',
      });

      router.push('/dashboard/events');
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: 'Erreur de mise à jour',
        description: error instanceof Error ? error.message : 'Une erreur est survenue.',
        variant: 'destructive',
      });
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Chargement..." description="" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-8">
        <PageHeader title="Événement introuvable" description="" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Modifier l'Événement"
        description="Mettez à jour les informations de votre événement."
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
            <CardContent className="space-y-6">
              {/* Nom */}
              <FormField
                control={form.control}
                name="eventName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'événement</FormLabel>
                    <FormControl>
                      <Input placeholder="Concert de Didi B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Catégorie */}
              <FormField
                control={form.control}
                name="eventCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
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

              {/* Date et Lieu */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                        <Input placeholder="Palais de la Culture, Abidjan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ✅ IMAGE CLOUDINARY - Simple ! */}
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

              {/* Description avec IA */}
              <FormField
                control={form.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez votre événement..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateDescription}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Génération...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Générer avec l'IA
                          </>
                        )}
                      </Button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keywords optionnel */}
              <FormField
                control={form.control}
                name="eventDescriptionKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mots-clés (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="vibrant, unique, inoubliable"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Utilisé pour la génération IA
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Billets */}
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Types de Billets</CardTitle>
              <CardDescription>
                Définissez les différents types de billets disponibles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-end gap-4 rounded-lg border p-4"
                >
                  <div className="grid flex-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`tickets.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input placeholder="VIP" {...field} />
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
                          <FormLabel>Prix (FCFA)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="10000"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`tickets.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantité</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({ name: '', price: 0, quantity: 100 })
                }
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Ajouter un type de billet
              </Button>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/events')}
            >
              Annuler
            </Button>
            <Button type="submit">Enregistrer les modifications</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}