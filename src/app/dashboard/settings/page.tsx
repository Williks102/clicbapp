'use client';

import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  updateUserProfile,
  updateUserEmail,
  updateUserPassword,
  updateNotificationPreferences,
  deleteUserAccount,
} from '@/app/actions/settings-actions';
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
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  // États pour les formulaires
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || '',
  });
  const [emailData, setEmailData] = useState({
    newEmail: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    platformUpdates: false,
  });

  // États de chargement
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // ==================== HANDLERS ====================

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const result = await updateUserProfile({
        name: profileData.name,
      });

      if (result.success) {
        toast({
          title: 'Profil mis à jour',
          description: result.message,
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    setIsUpdatingEmail(true);
    try {
      const result = await updateUserEmail({
        newEmail: emailData.newEmail,
      });

      if (result.success) {
        toast({
          title: 'Email mis à jour',
          description: result.message,
        });
        setEmailData({ newEmail: '' });
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    setIsUpdatingPassword(true);
    try {
      const result = await updateUserPassword(passwordData);

      if (result.success) {
        toast({
          title: 'Mot de passe mis à jour',
          description: result.message,
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateNotifications = async () => {
    setIsUpdatingNotifications(true);
    try {
      const result = await updateNotificationPreferences(notificationPrefs);

      if (result.success) {
        toast({
          title: 'Préférences mises à jour',
          description: result.message,
        });
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await deleteUserAccount();

      if (result.success) {
        toast({
          title: 'Compte supprimé',
          description: result.message,
        });
        // Déconnecter l'utilisateur après suppression
        setTimeout(() => {
          signOut({ callbackUrl: '/' });
        }, 2000);
      } else {
        toast({
          title: 'Erreur',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Paramètres du Compte"
        description="Gérez les informations de votre compte."
      />

      {/* Informations du profil */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Informations du Profil</CardTitle>
          <CardDescription>
            Modifiez votre nom et vos informations publiques.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-email">Email actuel</Label>
            <Input
              id="current-email"
              type="email"
              value={session?.user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez la section ci-dessous pour changer votre email
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button 
            onClick={handleUpdateProfile}
            disabled={isUpdatingProfile || !profileData.name}
          >
            {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les modifications
          </Button>
        </CardFooter>
      </Card>

      {/* Changer l'email */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Changer l'Email</CardTitle>
          <CardDescription>
            Mettez à jour votre adresse email. Vous devrez vérifier la nouvelle adresse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">Nouvelle adresse email</Label>
            <Input
              id="new-email"
              type="email"
              value={emailData.newEmail}
              onChange={(e) => setEmailData({ newEmail: e.target.value })}
              placeholder="nouvelle@email.com"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button 
            onClick={handleUpdateEmail}
            disabled={isUpdatingEmail || !emailData.newEmail}
          >
            {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mettre à jour l'email
          </Button>
        </CardFooter>
      </Card>

      {/* Changer le mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Changer le Mot de Passe</CardTitle>
          <CardDescription>
            Modifiez votre mot de passe pour sécuriser votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground">
              Au moins 8 caractères
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button 
            onClick={handleUpdatePassword}
            disabled={
              isUpdatingPassword || 
              !passwordData.currentPassword || 
              !passwordData.newPassword || 
              !passwordData.confirmPassword
            }
          >
            {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mettre à jour le mot de passe
          </Button>
        </CardFooter>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Notifications</CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez recevoir les notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="email-notifications" 
              checked={notificationPrefs.emailNotifications}
              onCheckedChange={(checked) => 
                setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked as boolean })
              }
            />
            <Label htmlFor="email-notifications" className="cursor-pointer">
              Recevoir les notifications par e-mail pour les ventes de votes et d'accès aux directs.
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="platform-updates"
              checked={notificationPrefs.platformUpdates}
              onCheckedChange={(checked) => 
                setNotificationPrefs({ ...notificationPrefs, platformUpdates: checked as boolean })
              }
            />
            <Label htmlFor="platform-updates" className="cursor-pointer">
              Recevoir les mises à jour et les nouveautés de la plateforme.
            </Label>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button 
            onClick={handleUpdateNotifications}
            disabled={isUpdatingNotifications}
          >
            {isUpdatingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les préférences
          </Button>
        </CardFooter>
      </Card>

      {/* Zone dangereuse */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="font-headline text-destructive">Zone Dangereuse</CardTitle>
          <CardDescription>
            Actions irréversibles sur votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Votre compte sera définitivement supprimé
                  et toutes vos données seront perdues.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Oui, supprimer mon compte
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}