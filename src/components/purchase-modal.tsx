'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Lock, ShoppingCart, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/types';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  ticketId: string;
  quantity: number;
  onProceedAsGuest: (email: string, name: string) => void;
  onProceedAsUser: () => void;
}

export function PurchaseModal({
  isOpen,
  onClose,
  event,
  ticketId,
  quantity,
  onProceedAsGuest,
  onProceedAsUser
}: PurchaseModalProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('guest');
  
  // État pour le formulaire invité
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestErrors, setGuestErrors] = useState<{email?: string; name?: string}>({});
  
  // État pour le formulaire de connexion
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const ticket = event.tickets.find(t => t.id === ticketId);
  const totalPrice = ticket ? ticket.price * quantity : 0;

  // Si l'utilisateur est déjà connecté, procéder directement
  if (session?.user) {
    onProceedAsUser();
    return null;
  }

  // Validation du formulaire invité
  const validateGuestForm = () => {
    const errors: {email?: string; name?: string} = {};
    
    if (!guestEmail) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      errors.email = 'Email invalide';
    }
    
    if (!guestName) {
      errors.name = 'Le nom est requis';
    } else if (guestName.length < 2) {
      errors.name = 'Le nom doit contenir au moins 2 caractères';
    }
    
    setGuestErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Achat en mode invité
  const handleGuestPurchase = async () => {
    if (!validateGuestForm()) return;
    
    setIsLoading(true);
    try {
      // Passer les infos invité au composant parent
      onProceedAsGuest(guestEmail, guestName);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Connexion puis achat
  const handleLogin = async () => {
    setLoginError('');
    setIsLoading(true);
    
    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      });

      if (result?.error) {
        setLoginError('Email ou mot de passe incorrect');
      } else if (result?.ok) {
        toast({
          title: 'Connexion réussie',
          description: 'Vous êtes maintenant connecté.',
        });
        // Actualiser la session puis procéder
        router.refresh();
        onProceedAsUser();
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setLoginError('Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirection vers inscription
  const handleSignUp = () => {
    // Sauvegarder les détails de l'achat dans le sessionStorage
    sessionStorage.setItem('pendingPurchase', JSON.stringify({
      eventId: event.id,
      ticketId,
      quantity
    }));
    router.push('/signup');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Finaliser votre achat</DialogTitle>
          <DialogDescription>
            {quantity} {quantity > 1 ? 'billets' : 'billet'} • {event.name} • {totalPrice.toLocaleString('fr-FR')} F CFA
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guest">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Achat rapide
            </TabsTrigger>
            <TabsTrigger value="login">
              <User className="mr-2 h-4 w-4" />
              Se connecter
            </TabsTrigger>
          </TabsList>

          {/* Achat en mode invité */}
          <TabsContent value="guest" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Achetez sans créer de compte. Votre billet sera envoyé par email.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="guest-name"
                    type="text"
                    placeholder="Jean Dupont"
                    className="pl-10"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      setGuestErrors(prev => ({ ...prev, name: undefined }));
                    }}
                  />
                </div>
                {guestErrors.name && (
                  <p className="text-sm text-destructive">{guestErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="jean@example.com"
                    className="pl-10"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setGuestErrors(prev => ({ ...prev, email: undefined }));
                    }}
                  />
                </div>
                {guestErrors.email && (
                  <p className="text-sm text-destructive">{guestErrors.email}</p>
                )}
              </div>

              <Button 
                onClick={handleGuestPurchase} 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Traitement...' : 'Procéder au paiement'}
              </Button>
            </div>
          </TabsContent>

          {/* Connexion */}
          <TabsContent value="login" className="space-y-4">
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                Connectez-vous pour retrouver tous vos billets dans votre espace personnel.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-10"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginError('');
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError('');
                    }}
                  />
                </div>
              </div>

              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleLogin} 
                className="w-full" 
                disabled={isLoading}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {isLoading ? 'Connexion...' : 'Se connecter et continuer'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Pas encore de compte ?
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSignUp}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Créer un compte
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}