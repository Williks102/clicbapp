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
import { users } from '@/lib/data';

export default function ProfilePage() {
    const organizerUser = users.find(u => u.id === 'org-1');
    const organizerAvatar = organizerUser?.avatar ? PlaceHolderImages.find((i) => i.id === organizerUser.avatar) : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Profil Organisateur"
          description="Gérez vos informations publiques."
        />
        {organizerUser && (
            <Button asChild variant="outline">
                <Link href={`/organizers/${organizerUser.id}`}>Voir mon profil public</Link>
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
              <AvatarFallback>{organizerUser?.name?.charAt(0) || 'O'}</AvatarFallback>
            </Avatar>
            <div className='flex-1 space-y-2'>
              <Label htmlFor="avatar-file">Photo de profil</Label>
              <Input id="avatar-file" type="file" />
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF jusqu'à 10MB</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-name">Nom de l'organisateur</Label>
            <Input id="organizer-name" defaultValue={organizerUser?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-bio">Biographie</Label>
            <Textarea
              id="organizer-bio"
              defaultValue={organizerUser?.bio}
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
