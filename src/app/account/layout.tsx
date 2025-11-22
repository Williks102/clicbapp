
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Ticket,
  UserCircle,
  Home,
  PanelLeft,
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
import { useIsMobile } from '@/hooks/use-mobile';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'next-auth/react';

function AccountHeader() {
  const { toggleSidebar } = useSidebar();
  const userAvatar = PlaceHolderImages.find((i) => i.id === 'organizer-2');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast({
      title: 'Déconnexion réussie',
    });
    router.push('/');
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
                {userAvatar && (
                    <AvatarImage src={userAvatar.imageUrl} alt="Avatar" data-ai-hint={userAvatar.imageHint} />
                )}
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href="/account/profile">Profil</Link>
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

function AccountNav() {
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
                        href="/account"
                        isActive={pathname === '/account'}
                        onClick={handleLinkClick}
                        tooltip="Mes Billets"
                    >
                        <Ticket />
                        <span>Mes Billets</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                     <SidebarMenuButton
                        href="/account/profile"
                        isActive={pathname === '/account/profile'}
                        onClick={handleLinkClick}
                        tooltip="Mon Profil"
                    >
                        <UserCircle />
                        <span>Mon Profil</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarContent>
    );
}


export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2">
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
        <AccountNav />
      </Sidebar>
      <SidebarInset>
        <AccountHeader />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
