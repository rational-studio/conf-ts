# conf-ts

A command-line tool to compile a subset of TypeScript files into JSON or YAML, extracting configuration or data.

## Features

- Compiles TypeScript files containing object literals, arrays, strings, numbers, booleans, and null into a single JSON or YAML output.
- Supports enums (numeric and string-based) and their initializers.
- Handles constant references and property access expressions.
- Processes object and array spread syntax.
- Supports multi-file projects, allowing you to organize your configuration across multiple TypeScript files.

## Installation

```bash
pnpm install
```

## Usage

To compile a TypeScript file (or multiple files, where the last file is considered the entry point with a default export) to JSON or YAML, run the following command:

```bash
pnpm start <inputFiles...>
```

You can specify the output format using the `--format` or `-f` option. The default format is JSON.

For example, to output JSON:

```bash
pnpm start src/config.ts
```

To output YAML:

```bash
pnpm start -f yaml src/config.ts
```

Or for a multi-file project:

```bash
pnpm start src/enums.ts src/constants.ts src/index.ts
```

The compiled output will be printed to `stdout`.

## Development

### Running Tests

```bash
pnpm test
```

### Building the Project

```bash
pnpm build
```

## Supported TypeScript Features

This tool supports a subset of TypeScript syntax relevant for defining data structures:

- String, Number, Boolean, and Null literals
- String template literals
- Object literals with property assignments, shorthand properties, and spread assignments
- Array literals with spread elements
- Enum declarations (numeric and string)
- Variable declarations with initializers (for constants)
- Property access expressions (for accessing enum members or constant values)
- Binary expressions for basic arithmetic operations on numbers
- Type casting expressions (e.g., `String(numberVariable)`)

## Unsupported TypeScript Features

The following TypeScript features are explicitly **not** supported and will result in an error:

- Functions (Arrow functions, Function expressions)
- Date objects (`new Date()`)
- Regular Expressions
- Any other complex types or language constructs not listed under "Supported TypeScript Features"
