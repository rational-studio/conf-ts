'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

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
    } catch (e: any) {
      setResult(null);
      setError(e?.toString?.() ?? String(e));
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

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    // Format on mount
    editor.getAction('editor.action.formatDocument')?.run().catch(() => {});
    // Cmd/Ctrl+S to format
    const formatKeybinding = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS;
    editor.addCommand(formatKeybinding, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">conf-ts Playground</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'json' | 'yaml')}
            className="rounded border px-2 py-1"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={macro}
              onChange={e => setMacro(e.target.checked)}
            />
            Macro mode
          </label>
          <span className="text-xs text-neutral-500 hidden md:inline">Press ⌘/Ctrl+S to format</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex min-h-[55vh] flex-col gap-2">
          <label className="text-sm font-medium">/index.conf.ts</label>
          <div className="min-h-[55vh] rounded border overflow-hidden">
            <MonacoEditor
              height="55vh"
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
              onMount={handleEditorMount}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Output</label>
          {error ? (
            <pre className="h-[55vh] overflow-auto rounded border bg-white p-3 text-sm text-red-600 whitespace-pre-wrap">
              {error}
            </pre>
          ) : (
            <div className="min-h-[55vh] rounded border overflow-hidden">
              <MonacoEditor
                key={`output-${format}`}
                height="55vh"
                language={format === 'json' ? 'json' : 'yaml'}
                theme="light"
                value={result?.output ?? ''}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
          )}
          {result?.dependencies?.length ? (
            <div className="text-xs text-neutral-500">
              Dependencies: {result.dependencies.join(', ')}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}


