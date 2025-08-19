## conf-ts

Compile TypeScript-based configs to JSON or YAML. Keep configs type-safe, composable, and multi-file — then emit plain data for production.

### Try it now

- **Playground**: [conf-ts.rational.studio](https://conf-ts.rational.studio)

## Why conf-ts

- **Type-safe configs**: Author in TypeScript with enums, constants, spreads, and expressions.
- **Deterministic output**: Produces JSON/YAML with no runtime TypeScript.
- **Macro mode (opt-in)**: Compile-time helpers for casting, array transforms, and env injection.
- **Multi-file + path aliases**: Works across files and honors `tsconfig.json` path aliases.

## Packages in this monorepo

- `@conf-ts/cli`: CLI to compile `.ts`/`.conf.ts` to JSON/YAML
- `@conf-ts/compiler`: Core compiler APIs (`compile`, `compileInMemory`)
- `@conf-ts/macro`: Macro functions available in macro mode
- `@conf-ts/webpack-loader`: Webpack loader that emits generated JSON/YAML files

## Installation

```bash
pnpm add -D @conf-ts/cli
# or
npm i -D @conf-ts/cli
# or
yarn add -D @conf-ts/cli
```

## CLI usage

```bash
conf-ts <fileEntry>

# JSON (default)
conf-ts src/config.conf.ts

# YAML
conf-ts -f yaml src/config.conf.ts

# Macro mode
conf-ts --macro src/config.conf.ts
```

The compiled output is printed to stdout.

## Macro mode

Enable with `--macro`. All macros must be imported from `@conf-ts/macro`.

### Type casting: `String()`, `Number()`, `Boolean()`

```ts
import { String, Number, Boolean } from '@conf-ts/macro';

export default {
  asString: String(123),  // "123"
  asNumber: Number('1'),  // 1
  asBoolean: Boolean(0),  // false
}
```

### Arrays: `arrayMap(array, item => expr)`

Constraints:
- Callback must be an arrow function with exactly one parameter
- Body must be a single return expression (or expression body)
- Only the parameter and literals can be referenced

```ts
import { arrayMap } from '@conf-ts/macro';

const nums = [1, 2, 3, 4];
export default {
  doubled: arrayMap(nums, x => x * 2),
}
```

### Environment: `env(key)`

```ts
import { env } from '@conf-ts/macro';

export default {
  nodeEnv: env('NODE_ENV'),
  port: Number(env('PORT') ?? '3000'),
}
```

## Programmatic API

### Node (compile files on disk)

```ts
import { compile } from '@conf-ts/compiler';

const { output, dependencies } = compile('path/to/index.conf.ts', 'json', false);
// output: string (JSON or YAML)
// dependencies: string[] of files that were evaluated
```

### Browser / in-memory (perfect for playgrounds)

```ts
import { compileInMemory } from '@conf-ts/compiler';

const files = {
  '/index.conf.ts': "export default { foo: 'bar' }",
};

const { output, dependencies } = compileInMemory(files, '/index.conf.ts', 'json', false);
```

## Webpack loader

The loader compiles a `.conf.ts` (or any TS entry) and writes a generated file next to it.

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.conf\.ts$/,
        use: [
          {
            loader: '@conf-ts/webpack-loader',
            options: {
              format: 'json',
              extensionToRemove: '.conf.ts',
              name: '[name].generated.json',
              logDependencies: false,
            },
          },
        ],
      },
    ],
  },
}
```

## Supported TypeScript

- Literals: string, number, boolean, null
- String template literals
- Object/array literals, spreads, shorthand properties
- Enums (string and numeric)
- Property access (including enums)
- Binary operators (+ - * / % comparisons)
- Unary prefix (+ - ! ~)
- Conditional (ternary)
- Parenthesized and `as`/`satisfies` expressions

## Not supported

- Functions (arrow/function expressions) in values
- `new Date()` and other `new` expressions
- Regular expressions
- `let`/`var` for referenced variables (only `const` is allowed)

## Scripts

```bash
pnpm build
pnpm test
pnpm format
```

## License

MIT

