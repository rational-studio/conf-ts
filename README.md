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
pnpm install @conf-ts/cli
```

## Usage

To compile a TypeScript file to JSON or YAML, run the following command:

```bash
conf-ts <fileEntry>
```

You can specify the output format using the `--format` or `-f` option. The default format is JSON.

For example, to output JSON:

```bash
conf-ts src/config.ts
```

To output YAML:

```bash
conf-ts -f yaml src/config.ts
```

The compiled output will be printed to `stdout`.

## Macro Mode

The `--macro` flag enables a special mode where certain macro functions can be used within your TypeScript configuration files. These macros are evaluated at compile time and allow for dynamic transformations or type conversions that are not typically possible with static TypeScript evaluation.

To enable macro mode, use the `--macro` flag:

```bash
conf-ts --macro src/config.ts
```

### Available Macros

All macros must be imported from `'@conf-ts/macro'`.

#### Type Casting Macros: `String()`, `Number()`, `Boolean()`

These macros allow you to explicitly cast values to `string`, `number`, or `boolean` types during compilation. This can be useful for ensuring the correct data type in your output configuration, especially when dealing with values that might otherwise be inferred differently.

**Examples:**

```ts
import { String, Number, Boolean } from '@conf-ts/macro';

const myNumber = 123;
const myString = "true";

export default {
  numberAsString: String(myNumber),    // "123"
  stringAsNumber: Number(myString),    // 1
  numberAsBoolean: Boolean(myNumber),  // true
  zeroAsBoolean: Boolean(0),           // false
};
```

**JSON Output:**
```json
{
  "numberAsString": "123",
  "stringAsNumber": 1,
  "numberAsBoolean": true,
  "zeroAsBoolean": false
}
```

#### `arrayMap(array, callback)`

This macro mimics `Array.prototype.map` but operates at compile time. It allows you to transform elements of an array based on a provided callback function.

**Constraints on the Callback:**

- The `callback` must be an arrow function.
- It must have exactly one parameter.
- Its body must be a single return statement.
- The callback can only use its parameter and literal values (e.g., numbers, strings, booleans). It cannot reference external variables, other functions, or complex expressions beyond simple arithmetic or string concatenation with its parameter.

**Examples:**

```ts
import { arrayMap } from '@conf-ts/macro';

const numbers = [1, 2, 3, 4, 5, 6];

export default {
  doubledAndFiltered: arrayMap(numbers, x => x % 2 === 0 ? x * 2 : x),
  asString: arrayMap(numbers, x => `${x}`),
  categorized: arrayMap(numbers, x => x > 3 ? 'large' : 'small'),
};
```

**JSON Output:**
```json
{
  "doubledAndFiltered": [
    1,
    4,
    3,
    8,
    5,
    12
  ],
  "asString": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "categorized": [
    "small",
    "small",
    "small",
    "large",
    "large",
    "large"
  ]
}
```

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

This tool supports a subset of TypeScript syntax relevant for defining data structures and configurations:

- **Literals:** String, Number, Boolean, and Null literals.
- **String Template Literals:** For dynamic string construction (e.g., ``Hello, ${name}!``).
- **Object Literals:** With property assignments, shorthand properties (e.g., `{ myVar }`), and spread assignments (e.g., `{ ...obj }`).
- **Array Literals:** Including spread elements (e.g., `[ ...arr ]`).
- **Enum Declarations:** Both numeric and string-based enums.
- **Variable Declarations:** Primarily for constants with initializers.
- **Property Access Expressions:** For accessing enum members or properties of evaluated objects (e.g., `myObject.property`, `MyEnum.Member`).
- **Binary Expressions:** Standard arithmetic (`+`, `-`, `*`, `/`, `%`) and comparison (`>`, `<`, `>=`, `<=`, `==`, `===`, `!=`, `!==`) operations.
- **Unary Prefix Expressions:** Such as `+`, `-`, `!`, `~`.
- **Conditional (Ternary) Expressions:** (e.g., `condition ? valueIfTrue : valueIfFalse`).
- **Parenthesized Expressions:** For controlling order of operations (e.g., `(a + b) * c`).

## Unsupported TypeScript Features

The following TypeScript features are explicitly **not** supported and will result in an error:

- Functions (Arrow functions, Function expressions)
- Date objects (`new Date()`)
- Regular Expressions
- Any other complex types or language constructs not listed under "Supported TypeScript Features"

