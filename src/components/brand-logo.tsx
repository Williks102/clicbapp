import Link from 'next/link';
import { Vote } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  href?: string;
  className?: string;
  /** Applique la couleur claire du pied de page. */
  inverted?: boolean;
  showTag?: boolean;
};

export function BrandLogo({
  href = '/',
  className,
  inverted = false,
  showTag = true,
}: BrandLogoProps) {
  return (
    <Link href={href} className={cn('flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Vote className="h-5 w-5" />
      </span>
      <span
        className={cn(
          'font-headline text-xl font-bold tracking-tight',
          inverted && 'text-white'
        )}
      >
        ClicVote
      </span>
      {showTag && (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
          CI
        </span>
      )}
    </Link>
  );
}
