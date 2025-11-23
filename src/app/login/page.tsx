
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
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
import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
            setError('Email ou mot de passe incorrect.');
        } else {
            setError('Une erreur est survenue. Veuillez réessayer.');
        }
        toast({
          title: 'Erreur de connexion',
          description: 'Veuillez vérifier vos identifiants.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Fetch session to get user role
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        
        toast({
          title: 'Connexion réussie',
          description: 'Vous êtes maintenant connecté.',
        });

        // Redirect based on role
        if (session?.user?.role === 'admin') {
          router.push('/admin');
        } else if (session?.user?.role === 'organizer') {
          router.push('/dashboard');
        } else {
          router.push('/account');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Email ou mot de passe incorrect.');
       toast({
          title: 'Erreur de connexion',
          description: 'Veuillez vérifier vos identifiants.',
          variant: 'destructive',
        });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex flex-1 items-center justify-center bg-secondary/50 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Connexion</CardTitle>
            <CardDescription>
              Accédez à votre tableau de bord.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
