
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Home,
  LayoutDashboard,
  PanelLeft,
  PlusCircle,
  QrCode,
  Settings,
  UserCircle,
  ShoppingCart,
  LogOut,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';

function DashboardHeader() {
  const { toggleSidebar } = useSidebar();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast({
      title: 'Déconnexion réussie',
    });
    router.push('/login');
  };

  const organizerAvatar = PlaceHolderImages.find((i) => i.id === 'organizer-1');

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Button
        size="icon"
        variant="outline"
        className="sm:hidden"
        onClick={toggleSidebar}
      >
        <PanelLeft className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <div className="ml-auto flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Voir le site
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full"
            >
              <Avatar>
                {organizerAvatar && (
                  <AvatarImage
                    src={organizerAvatar.imageUrl}
                    alt="Avatar"
                    data-ai-hint={organizerAvatar.imageHint}
                  />
                )}
                <AvatarFallback>O</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">Paramètres</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function DashboardNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            href="/dashboard"
            isActive={pathname === '/dashboard'}
            tooltip="Dashboard"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/dashboard">
              <LayoutDashboard />
              <span>Tableau de Bord</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            href="/dashboard/events"
            isActive={pathname.startsWith('/dashboard/events')}
            tooltip="Events"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/dashboard/events">
              <Calendar />
              <span>Événements</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            href="/dashboard/sales"
            isActive={pathname.startsWith('/dashboard/sales')}
            tooltip="Ventes"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/dashboard/sales">
              <ShoppingCart />
              <span>Ventes</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            href="/dashboard/scanner"
            isActive={pathname.startsWith('/dashboard/scanner')}
            tooltip="Scanner"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/dashboard/scanner">
              <QrCode />
              <span>Scanner</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            href="/dashboard/profile"
            isActive={pathname === '/dashboard/profile'}
            tooltip="Profile"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/dashboard/profile">
              <UserCircle />
              <span>Profil Organisateur</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            href="/dashboard/settings"
            isActive={pathname === '/dashboard/settings'}
            tooltip="Settings"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/dashboard/settings">
              <Settings />
              <span>Paramètres</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2">
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
        </SidebarHeader>
        <DashboardNav />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/events/create">
                  <PlusCircle />
                  <span>Créer un événement</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
