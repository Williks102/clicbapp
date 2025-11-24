
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  PanelLeft,
  Settings,
  Users,
  Calendar,
  Wallet,
  ShoppingCart,
  QrCode,
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
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function AdminHeader() {
  const { toggleSidebar } = useSidebar();
  const adminAvatar = PlaceHolderImages.find((i) => i.id === 'organizer-2');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await nextAuthSignOut({ redirect: false });
    toast({
      title: 'Déconnexion réussie',
    });
    router.push('/login');
  };

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
                {adminAvatar && (
                  <AvatarImage
                    src={adminAvatar.imageUrl}
                    alt="Avatar"
                    data-ai-hint={adminAvatar.imageHint}
                  />
                )}
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Compte Admin</DropdownMenuLabel>
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

function AdminNav() {
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
            isActive={pathname === '/admin'}
            tooltip="Dashboard"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/admin">
                <LayoutDashboard />
                <span>Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith('/admin/events')}
            tooltip="Events"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/admin/events">
                <Calendar />
                <span>Événements</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/admin/sales'}
            tooltip="Ventes"
            onClick={handleLinkClick}
            asChild
          >
             <Link href="/admin/sales">
                <ShoppingCart />
                <span>Ventes</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/admin/users'}
            tooltip="Users"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/admin/users">
                <Users />
                <span>Utilisateurs</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/admin/commissions'}
            tooltip="Commissions"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/admin/commissions">
                <Wallet />
                <span>Commissions</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/admin/scanner'}
            tooltip="Scanner"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/admin/scanner">
                <QrCode />
                <span>Scanner</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/admin/settings'}
            tooltip="Settings"
            onClick={handleLinkClick}
            asChild
          >
            <Link href="/admin/settings">
                <Settings />
                <span>Paramètres</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  );
}


export default function AdminLayout({
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
        return <div className="flex h-screen items-center justify-center"><Skeleton className="h-10 w-48" /></div>
    }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/admin" className="flex items-center gap-2">
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
        <AdminNav />
      </Sidebar>
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
