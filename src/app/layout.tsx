
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { config } from 'dotenv';

config();

export const metadata: Metadata = {
  title: 'Mini Heróis: Construtor de Hábitos para Crianças',
  description: 'Transforme a rotina em aventura! Plataforma gamificada para gerenciar tarefas, incentivar hábitos e fortalecer laços familiares com missões e recompensas.',
  metadataBase: new URL('https://mini-herois-app.com'), // TODO: Substituir pelo domínio real
  keywords: ['construtor de hábitos', 'crianças', 'gamificação', 'rotina infantil', 'tarefas para crianças', 'reforço positivo'],
  creator: 'Mini Heróis Team',
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Mini Heróis: Construtor de Hábitos para Crianças',
    description: 'Transforme a rotina em aventura! Gamificação para gerenciar tarefas e incentivar hábitos em crianças.',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Mini Heróis - A Aventura da Rotina',
      },
    ],
    siteName: 'Mini Heróis',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&family=Quicksand:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased", "bg-background text-foreground")} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
