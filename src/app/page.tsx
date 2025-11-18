import { QuoteGenerator } from '@/components/quote-generator';
import { FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-10 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-start gap-4 px-4 md:px-6">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-xl font-bold tracking-tight md:text-2xl">
            PDF Quote Generator
          </h1>
        </div>
      </header>
      <main className="container mx-auto p-4 py-8 md:p-6 lg:p-8">
        <QuoteGenerator />
      </main>
    </div>
  );
}
