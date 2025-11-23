
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useDoc, useFirebase } from '@/firebase';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import type { Organizer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const { firestore } = useFirebase();
    const isLoadingSession = status === 'loading';

    const organizerRef = useMemo(
      () => (firestore && session?.user?.id ? doc(firestore, 'organizers', session.user.id) : null),
      [firestore, session]
    );

    const { data: organizer, isLoading: isLoadingOrganizer } = useDoc<Organizer>(organizerRef);

    const isLoading = isLoadingSession || isLoadingOrganizer;
    
    const organizerAvatar = organizer?.avatar ? PlaceHolderImages.find((i) => i.id === organizer.avatar) : null;

    if (isLoading) {
        return <ProfilePageSkeleton />;
    }

  return (
    <div className="space-y-8">
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
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
                {organizerAvatar && (
                    <AvatarImage src={organizerAvatar.imageUrl} alt="Avatar" data-ai-hint={organizerAvatar.imageHint} />
                )}
              <AvatarFallback>{organizer?.name?.charAt(0) || 'O'}</AvatarFallback>
            </Avatar>
            <div className='flex-1 space-y-2'>
              <Label htmlFor="avatar-file">Photo de profil</Label>
              <Input id="avatar-file" type="file" />
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF jusqu'à 10MB</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-name">Nom de l'organisateur</Label>
            <Input id="organizer-name" defaultValue={organizer?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-bio">Biographie</Label>
            <Textarea
              id="organizer-bio"
              defaultValue={organizer?.bio}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button>Enregistrer les modifications</Button>
        </CardFooter>
      </Card>
    </div>
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
                <div className="flex items-center gap-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <div className='flex-1 space-y-2'>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-3 w-40" />
                    </div>
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
    )
}
