import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://xyquiver.sirinsec.chatgpt.site'),
  title: 'XyQuiver — Xy-pic diagram editor',
  description:
    'Draw categorical diagrams with ordinary and attached arrows, then export Typora-ready Xy-pic or SVG.',
  openGraph: {
    title: 'XyQuiver — attached arrows for Xy-pic',
    description:
      'Draw categorical diagrams and export Typora-ready Xy-pic or standalone SVG.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'XyQuiver editor' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XyQuiver — attached arrows for Xy-pic',
    description:
      'Draw categorical diagrams and export Typora-ready Xy-pic or standalone SVG.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
