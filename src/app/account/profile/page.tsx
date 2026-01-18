
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, updateUserPassword } from '@/app/actions/settings-actions';

// Schemas
const profileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  email: z.string().email(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis.'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['confirmPassword'],
});

export default function BuyerProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const { toast } = useToast();
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Profile Form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  // Password Form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (session?.user) {
      profileForm.reset({
        name: session.user.name || '',
        email: session.user.email || '',
      });
    }
  }, [session, profileForm]);

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    setIsProfileSaving(true);
    try {
      const result = await updateUserProfile({ name: values.name });
      if (result.success) {
        toast({ title: 'Succès', description: 'Votre profil a été mis à jour.' });
        // Mettre à jour la session NextAuth pour refléter le nouveau nom
        await updateSession({ name: values.name });
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsPasswordSaving(true);
    try {
      const result = await updateUserPassword(values);
      if (result.success) {
        toast({ title: 'Succès', description: 'Votre mot de passe a été changé.' });
        passwordForm.reset();
      } else {
        toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erreur', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (status === 'loading') {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mon Profil"
        description="Gérez vos informations personnelles et vos paramètres de compte."
      />
      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Informations Personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Nom et Prénoms</Label>
              <Input
                id="full-name"
                {...profileForm.register('name')}
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse E-mail</Label>
              <Input
                id="email"
                type="email"
                disabled
                {...profileForm.register('email')}
              />
              <p className="text-xs text-muted-foreground">
                Pour changer votre e-mail, contactez le support.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isProfileSaving}>
              {isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les modifications
            </Button>
          </CardFooter>
        </Card>
      </form>

      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Changer de mot de passe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <Input
                id="current-password"
                type="password"
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isPasswordSaving}>
              {isPasswordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mettre à jour le mot de passe
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
