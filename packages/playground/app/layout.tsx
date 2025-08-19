import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-gradient-to-br from-white to-neutral-100 text-neutral-900 antialiased">
        <div className="min-h-dvh flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-t-neutral-200 bg-neutral-100">
            <div className="mx-auto max-w-7xl px-6 py-6 text-sm text-neutral-600 flex items-center justify-between">
              <span>© {new Date().getFullYear()} Rational Studio / conf-ts. MIT License.</span>
              <a
                href="https://github.com/rational-studio/conf-ts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.86 9.68.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.79.62-3.38-1.37-3.38-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.73 0 0 .85-.28 2.79 1.05.81-.23 1.68-.35 2.55-.36.86 0 1.74.12 2.55.36 1.94-1.33 2.79-1.05 2.79-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.81-4.57 5.07.36.32.67.94.67 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"/>
                </svg>
                GitHub
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

