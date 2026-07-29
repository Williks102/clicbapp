'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, Vote } from 'lucide-react';

import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/account', label: 'Mon activité', icon: Vote },
  { href: '/account/profile', label: 'Mon profil', icon: UserCircle },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />

      <div className="border-b bg-muted/30">
        <div className="container mx-auto flex gap-1 px-4">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
