import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}

