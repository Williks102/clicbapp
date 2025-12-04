
'use client';

import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  HelpCircle,
  Info,
  LifeBuoy,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import Footer from '@/components/footer';
import MainNav from '@/components/main-nav';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ContactPage() {
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        toast({
            title: "Message envoyé !",
            description: "Merci de nous avoir contactés. Nous vous répondrons bientôt.",
        });
        e.currentTarget.reset();
    };

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 bg-secondary/30 py-12 md:py-16">
        <div className="container">
          <PageHeader
            title="Nous contacter"
            description="Une question ? Une suggestion ? Nous sommes là pour vous écouter."
            className="text-center mb-12"
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Formulaire de contact */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Mail className="h-6 w-6" /> Envoyez-nous un message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom complet *</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" name="email" type="email" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Sujet *</Label>
                      <Select name="subject" required>
                        <SelectTrigger id="subject">
                          <SelectValue placeholder="Choisissez un sujet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Question générale">
                            Question générale
                          </SelectItem>
                          <SelectItem value="Problème technique">
                            Problème technique
                          </SelectItem>
                          <SelectItem value="Problème de paiement">
                            Problème de paiement
                          </SelectItem>
                          <SelectItem value="Demande de remboursement">
                            Demande de remboursement
                          </SelectItem>
                          <SelectItem value="Devenir partenaire">
                            Devenir partenaire
                          </SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        placeholder="Décrivez votre demande en détail..."
                        required
                      />
                    </div>

                    <Button type="submit" size="lg">
                      <Send className="mr-2 h-4 w-4" /> Envoyer le message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Informations et liens */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">
                    Informations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <h6 className="font-semibold">Email</h6>
                      <p className="text-sm text-muted-foreground">
                        contact@clicbillet.com
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <h6 className="font-semibold">Téléphone</h6>
                      <p className="text-sm text-muted-foreground">
                        +225 07 02 49 02 77
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <h6 className="font-semibold">Adresse</h6>
                      <p className="text-sm text-muted-foreground">
                        Abidjan, Cocody, Côte d'Ivoire
                      </p>
                    </div>
                  </div>
                   <div className="flex items-start gap-3">
                    <Clock className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <h6 className="font-semibold">Horaires support</h6>
                      <p className="text-sm text-muted-foreground">
                        Lun - Ven : 8h - 18h <br />
                        Samedi : 9h - 15h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Liens utiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      { href: '/cgu', icon: FileText, label: 'Conditions Générales' },
                      { href: '/privacy', icon: HelpCircle, label: 'Politique de confidentialité' },
                    ].map(item => (
                       <li key={item.href}>
                        <Link href={item.href} className="flex items-center gap-2 text-sm hover:text-primary">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
