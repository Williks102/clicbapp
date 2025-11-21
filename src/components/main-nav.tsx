'use client';

import Link from 'next/link';
import {
  Ticket,
  Menu,
  UserCircle,
  Search,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export default function MainNav() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/#events', label: 'Événements' },
    { href: '/#contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-primary"
          >
            <rect width="8" height="16" x="8" y="4" rx="2" ry="2" />
            <path d="M10 4h4" />
            <path d="M10 20h4" />
            <path d="m8 12-5 2" />
            <path d="m16 12 5 2" />
            <path d="M8 8H4" />
            <path d="M16 8h4" />
          </svg>
          <span className="font-headline text-xl font-bold">ClicBillet</span>
          <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
            CI
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                'transition-colors hover:text-primary',
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-4 md:flex">
          <div className="relative w-64">
            <Input
              type="search"
              placeholder="Rechercher un événement..."
              className="pr-10"
            />
            <Button
              type="submit"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:bg-primary/10"
            >
              <Search className="h-4 w-4" />
              <span className="sr-only">Rechercher</span>
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Panier</span>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild>
            <Link href="/account">
              Créer un compte
            </Link>
          </Button>
        </div>
        {isMobile && (
          <div className="ml-auto md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex h-full flex-col p-6">
                  <Link href="/" className="mb-8 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-7 w-7 text-primary"
                    >
                      <rect width="8" height="16" x="8" y="4" rx="2" ry="2" />
                      <path d="M10 4h4" />
                      <path d="M10 20h4" />
                      <path d="m8 12-5 2" />
                      <path d="m16 12 5 2" />
                      <path d="M8 8H4" />
                      <path d="M16 8h4" />
                    </svg>
                    <span className="font-headline text-xl font-bold">
                      ClicBillet
                    </span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.label}>
                        <Link href={link.href} className="text-lg">
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                    <SheetClose asChild>
                      <Link href="/login" className="text-lg">
                        Connexion
                      </Link>
                    </SheetClose>
                  </nav>
                  <Button asChild className="mt-auto">
                    <Link href="/account">Créer un compte</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  );
}