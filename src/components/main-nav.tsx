'use client';

import Link from 'next/link';
import { LogOut, Menu, Radio } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandLogo } from '@/components/brand-logo';

const navLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/competitions', label: 'Concours' },
  { href: '/live', label: 'En direct' },
  { href: '/contact', label: 'Contact' },
];

export default function MainNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const userRole = session?.user?.role;
  const dashboardHref = userRole === 'admin' ? '/admin' : '/dashboard';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const UserMenu = () => {
    if (status === 'loading') return null;

    if (session) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
              <Avatar>
                <AvatarFallback>
                  {session.user?.name?.charAt(0) ||
                    session.user?.email?.charAt(0) ||
                    'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">Mes votes &amp; accès</Link>
            </DropdownMenuItem>
            {(userRole === 'admin' || userRole === 'organizer') && (
              <DropdownMenuItem asChild>
                <Link href={dashboardHref}>Tableau de bord</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/login">Connexion</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Créer un compte</Link>
        </Button>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center px-4">
        <BrandLogo className="mr-6" />

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-1.5 transition-colors hover:text-primary',
                isActive(link.href) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {link.href === '/live' && <Radio className="h-4 w-4" />}
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          <UserMenu />
        </div>

        <div className="ml-auto md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-full flex-col p-6">
                <BrandLogo className="mb-8" showTag={false} />
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link href={link.href} className="text-lg">
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}

                  {session && (
                    <>
                      <div className="my-4 h-px bg-border" />
                      <div className="text-sm font-semibold text-muted-foreground">
                        Mon Compte
                      </div>
                      <SheetClose asChild>
                        <Link href="/account" className="text-lg">
                          Mes votes &amp; accès
                        </Link>
                      </SheetClose>
                      {(userRole === 'admin' || userRole === 'organizer') && (
                        <SheetClose asChild>
                          <Link href={dashboardHref} className="text-lg">
                            Tableau de bord
                          </Link>
                        </SheetClose>
                      )}
                    </>
                  )}

                  {!session && (
                    <SheetClose asChild>
                      <Link href="/login" className="text-lg">
                        Connexion
                      </Link>
                    </SheetClose>
                  )}
                </nav>

                {session ? (
                  <Button
                    variant="outline"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="mt-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </Button>
                ) : (
                  <Button asChild className="mt-auto">
                    <Link href="/signup">Créer un compte</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
