'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/themes/prism.css';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type CompileResult = { output: string; dependencies: string[] };

export default function Page() {
  const [input, setInput] = useState<string>(
    `// Write a conf-ts file with a default export
// Example:
// import { env, arrayMap, String } from '@conf-ts/macro';
// const nums = [1,2,3] as const;
// export default {
//   message: String('hello'),
//   list: arrayMap(nums, (n) => n + 1),
//   nodeEnv: env('NODE_ENV'),
// } satisfies Record<string, unknown>;

export default { greeting: 'hello world', nested: { a: 1, b: 2 } } as const;
`
  );
  const [format, setFormat] = useState<'json' | 'yaml'>('json');
  const [macro, setMacro] = useState<boolean>(false);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const debounceTimer = useRef<number | null>(null);
  const editorRef = useRef<any>(null);

  const files = useMemo(() => {
    return {
      '/index.conf.ts': input,
      '/tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          jsx: 'react-jsx',
        }
      }),
    } as Record<string, string>;
  }, [input]);

  const compile = useCallback(async () => {
    setError(null);
    try {
      const { compileInMemory } = await import('@conf-ts/compiler/browser');
      const compiled = compileInMemory(files, '/index.conf.ts', format, macro);
      setResult(compiled);
      // Client-side highlight using Prism
      const grammar = Prism.languages[format === 'json' ? 'json' : 'yaml'];
      const html = Prism.highlight(compiled.output, grammar, format);
      setHighlighted(html);
    } catch (e: any) {
      setResult(null);
      setError(e?.toString?.() ?? String(e));
      setHighlighted('');
    }
  }, [files, format, macro]);

  useEffect(() => {
    void compile();
  }, []);

  // Auto-compile on change with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      void compile();
    }, 300);
    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, [input, format, macro, compile]);

  const handleCopyOutput = useCallback(async () => {
    if (!result?.output && !error) return;
    try {
      await navigator.clipboard.writeText(result?.output ?? error ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }, [result, error]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">playground.conf.ts</h1>
            <p className="text-sm text-neutral-500">Compile .conf.ts to JSON/YAML in your browser</p>
          </div>
          <span className="ml-2 rounded-full bg-neutral-900/5 px-2.5 py-0.5 text-xs text-neutral-600 ring-1 ring-inset ring-neutral-900/10">beta</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Format</span>
            <div className="inline-flex h-9 rounded-lg border bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setFormat('json')}
                aria-pressed={format === 'json'}
                className={`h-full px-3 text-sm rounded-md transition-colors ${format === 'json' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => setFormat('yaml')}
                aria-pressed={format === 'yaml'}
                className={`h-full px-3 text-sm rounded-md transition-colors ${format === 'yaml' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
                YAML
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyOutput}
            disabled={!result?.output && !error}
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            {copied ? 'Copied' : 'Copy output'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Macro</span>
            <button
              type="button"
              onClick={() => setMacro(v => !v)}
              aria-pressed={macro}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${macro ? 'bg-neutral-900' : 'bg-neutral-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${macro ? 'translate-x-5' : 'translate-x-1'}`} />
              <span className="sr-only">Toggle macro mode</span>
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="relative grid h-[75vh] grid-rows-[auto_1fr]">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">/index.conf.ts</label>
          </div>
          <div className="row-start-2 min-h-0 overflow-hidden rounded-xl border bg-white shadow-sm ring-1 ring-black/5">
            <MonacoEditor
              height="100%"
              defaultLanguage="typescript"
              path="/index.conf.ts"
              theme="vs-dark"
              value={input}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontLigatures: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
              onChange={(value) => setInput(value ?? '')}
            />
          </div>
        </div>
        <div className="relative grid h-[75vh] grid-rows-[auto_1fr]">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-neutral-700">Output</label>
          </div>
          {error ? (
            <pre className="row-start-2 min-h-0 h-full whitespace-pre-wrap overflow-auto rounded-xl border bg-white p-3 text-sm text-red-600 shadow-sm ring-1 ring-black/5">
              {error}
            </pre>
          ) : (
            <pre className="row-start-2 min-h-0 h-full overflow-auto rounded-xl border bg-white p-3 text-sm shadow-sm ring-1 ring-black/5 language-json" tabIndex={0}>
              {/* eslint-disable-next-line react/no-danger */}
              <code
                className={format === 'json' ? 'language-json' : 'language-yaml'}
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            </pre>
          )}
        </div>
      </section>
    </main>
  );
}


