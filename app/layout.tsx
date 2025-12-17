import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifeRX Brain',
  description: 'Operator control plane for LifeRX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Light mode background */}
          <div className="fixed inset-0 -z-10 bg-background bg-texture-light dark:bg-glow-dark" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
