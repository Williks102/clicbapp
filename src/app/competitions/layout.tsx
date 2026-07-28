import MainNav from '@/components/main-nav';
import Footer from '@/components/footer';

export default function CompetitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
