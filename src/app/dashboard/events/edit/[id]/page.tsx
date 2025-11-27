'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import {
  Wand2,
  Trash,
  PlusCircle,
  Upload,
  X,
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
import Image from 'next/image';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
  image: z.any().optional(),
});

export type EventFormValues = z.infer<typeof formSchema>;

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const firestore = useFirestore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger l'événement depuis Firestore
  const eventRef = useMemo(
    () => (firestore && eventId ? doc(firestore, `events/${eventId}`) : null),
    [firestore, eventId]
  );
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: '',
      eventCategory: '',
      eventDate: '',
      eventLocation: '',
      eventDescription: '',
      tickets: [{ name: 'Standard', price: 10000, quantity: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tickets',
  });

  // Pré-remplir le formulaire quand l'événement est chargé
  useEffect(() => {
    if (event) {
      // Convertir la date ISO en format datetime-local
      const eventDate = new Date(event.date);
      const localDate = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      form.reset({
        eventName: event.name,
        eventCategory: event.category,
        eventDate: localDate,
        eventLocation: event.location,
        eventDescription: event.description,
        tickets: event.tickets || [{ name: 'Standard', price: 10000, quantity: 100 }],
      });

      // Afficher l'image actuelle
      if (event.image) {
        if (event.image.startsWith('http')) {
          setImagePreview(event.image);
        } else {
          const placeholderImage = PlaceHolderImages.find(img => img.id === event.image);
          if (placeholderImage) {
            setImagePreview(placeholderImage.imageUrl);
          }
        }
      }
    }
  }, [event, form]);

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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "Veuillez choisir une image de moins de 5MB.",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(data: EventFormValues) {
    const formData = new FormData();
    if (fileInputRef.current?.files?.[0]) {
      formData.append('image', fileInputRef.current.files[0]);
    }

    try {
      await updateEvent(eventId, data, formData);

      toast({
        title: 'Événement modifié avec succès !',
        description: 'Les modifications ont été enregistrées.',
      });

      router.push('/dashboard/events');
    } catch (error) {
      console.error("Error updating event: ", error);
      toast({
        title: 'Erreur de modification',
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la modification de l'événement.",
        variant: 'destructive',
      });
    }
  }

  if (isLoadingEvent) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Modifier l'Événement"
          description="Chargement des données..."
        />
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Événement introuvable"
          description="L'événement que vous cherchez n'existe pas."
        />
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Cet événement n'existe pas ou a été supprimé.
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => router.push('/dashboard/events')}>
                Retour à mes événements
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Modifier l'Événement"
        description="Modifiez les informations de votre événement."
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-dashed flex items-center justify-center">
                          {imagePreview ? (
                            <>
                              <Image src={imagePreview} alt="Aperçu" fill className="object-cover" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute right-1 top-1 h-6 w-6 z-10"
                                onClick={() => {
                                  setImagePreview(null);
                                  if (fileInputRef.current) fileInputRef.current.value = '';
                                  field.onChange(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            ref={fileInputRef}
                            onChange={(e) => {
                              handleImageChange(e);
                              field.onChange(e.target.files?.[0]);
                            }}
                          />
                          <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, WEBP. Max 5MB.</p>
                        </div>
                      </div>
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

              <FormField
                control={form.control}
                name="eventDescriptionKeywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mots-clés pour la génération (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: vibrant, culturel, familial"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ces mots-clés seront utilisés pour générer la description avec l'IA.
                    </FormDescription>
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
                Définissez les types de billets et leurs prix.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Billet #{index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`tickets.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du billet</FormLabel>
                          <FormControl>
                            <Input placeholder="ex: VIP" {...field} />
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
                            <Input
                              type="number"
                              placeholder="100"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/events')}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Modification en cours...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}