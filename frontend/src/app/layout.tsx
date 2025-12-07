// frontend/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Pronexma Protocol | Milestone-Based Settlement Layer',
  description: 'Trustless milestone-based escrow and vesting for Qubic/Nostromo launches and RWA settlements.',
  keywords: ['Qubic', 'Nostromo', 'DeFi', 'escrow', 'vesting', 'settlement', 'blockchain'],
  authors: [{ name: 'Pronexma Protocol' }],
  openGraph: {
    title: 'Pronexma Protocol',
    description: 'Milestone-Based Settlement Layer for Qubic/Nostromo',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-base antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
