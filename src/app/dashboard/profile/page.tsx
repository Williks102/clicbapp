
'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRealtimeRow } from '@/hooks/use-realtime-query';
import { toOrganizer } from '@/lib/supabase/mappers';
import type { OrganizerRow } from '@/lib/supabase/types';
import { useSession } from 'next-auth/react';
import { useMemo, useEffect, useState } from 'react';
import type { Organizer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/app/actions/settings-actions';
import { ImageUploader } from '@/components/image-uploader';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Le nom est requis.'),
  bio: z.string().optional(),
  avatar: z.string().optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const isLoadingSession = status === 'loading';
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { data: organizer, isLoading: isLoadingOrganizer } = useRealtimeRow<
    OrganizerRow,
    Organizer
  >({
    table: 'organizers',
    id: session?.user?.id,
    map: toOrganizer,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', bio: '', avatar: '' },
  });

  useEffect(() => {
    if (organizer) {
      const avatarUrl = organizer.avatar && !organizer.avatar.startsWith('http')
        ? PlaceHolderImages.find(i => i.id === organizer.avatar)?.imageUrl
        : organizer.avatar;

      form.reset({
        name: organizer.name || '',
        bio: organizer.bio || '',
        avatar: avatarUrl || '',
      });
    }
  }, [organizer, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const result = await updateUserProfile(data);
      if (result.success) {
        toast({ title: 'Profil mis à jour', description: 'Vos informations publiques ont été enregistrées.' });
        await updateSession({ name: data.name }); // Update session name
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingSession || isLoadingOrganizer;
  const currentAvatarUrl = form.watch('avatar');

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Profil Organisateur"
          description="Gérez vos informations publiques."
        />
        {organizer && (
          <Button asChild variant="outline">
            <Link href={`/organizers/${organizer.id}`}>Voir mon profil public</Link>
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Informations</CardTitle>
          <CardDescription>
            Ces informations seront visibles par les acheteurs sur votre page de profil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Photo de profil</Label>
            <Controller
              name="avatar"
              control={form.control}
              render={({ field }) => (
                <ImageUploader
                  value={field.value}
                  onChange={field.onChange}
                  onRemove={() => field.onChange('')}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-name">Nom de l'organisateur</Label>
            <Input id="organizer-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-bio">Biographie</Label>
            <Textarea
              id="organizer-bio"
              className="min-h-[100px]"
              {...form.register('bio')}
            />
            {form.formState.errors.bio && (
              <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function ProfilePageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Profil Organisateur"
          description="Gérez vos informations publiques."
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Informations</CardTitle>
          <CardDescription>
            Ces informations seront visibles par les acheteurs sur votre page de profil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Skeleton className="h-10 w-40" />
        </CardFooter>
      </Card>
    </div>
  );
}
