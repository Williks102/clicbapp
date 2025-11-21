'use client';

import Link from 'next/link';
import { Ticket, Menu, UserCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export default function MainNav() {
  const isMobile = useIsMobile();

  const navLinks = [
    { href: '/#events', label: 'Parcourir' },
    { href: '/dashboard/events/create', label: 'Créer un événement' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center gap-2">
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
          <span className="font-headline text-xl font-bold">ClicBillet</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-4 md:flex">
          <Button variant="ghost" asChild>
             <Link href="/login">Espace Organisateur</Link>
          </Button>
          <Button asChild>
            <Link href="/account">
                <UserCircle className="mr-2" />
                Mon Compte
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
                        <Link href="/login" className="text-lg">Espace Organisateur</Link>
                      </SheetClose>
                  </nav>
                  <Button asChild className="mt-auto">
                    <Link href="/account">Mon Compte</Link>
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
