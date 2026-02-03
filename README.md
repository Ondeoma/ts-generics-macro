# ts-generics-macro

This is a Source Transformer that allows you to create function macros in TypeScript.
It is designed for use with [ts-patch](https://github.com/nonara/ts-patch).

This package is inspired by [ts-macros](https://github.com/GoogleFeud/ts-macros).
While `ts-macros` is a great tool,
  it appears to be currently unmaintained (no commits for over 2 years and inactive on issues/PRs),
  which has left some instability around generics unresolved.

This project aims to provide a **focused** alternative specifically for fundamental function macros,
  prioritizing stability around generics.

## Usage

### 1. Configuration

Add it to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "plugins": [
      {"transform": "@ondeoma/ts-generics-macro"}
    ]
  }
}
```

### 2. Writing Macros

**In your code:**
```typescript
// Define your macro function.
// By default, functions ending with "$macro$" are treated as macros.
function add$macro$(
  a: number,
  b: number,
): number {
  return a + b;
}

// Use the macro.
console.log(add$macro$(1, 2));
```

**Transformed result:**
```typescript
// using macro.
console.log(
  (function (
    a: number,
    b: number,
  ): number {
    return a + b;
  })(1, 2)
);
```
The macro call is expanded inline, wrapping the body.

You can check `package/test-fixtures` for more examples of source codes and their expected transformed outputs.

## Options
- `macroSuffix`: The function name suffix used to identify macros. Default is `$macro$`.

## Notes
Standard Source Transformers do not automatically update the `TypeChecker` after modifying the AST.
Since this transformer relies on the `TypeChecker` (and modifies the AST itself),
  chaining it with other transformers may lead to stale type information.

To ensure the `TypeChecker` remains up-to-date throughout the transformation pipeline,
  consider using [ts-rebuild](https://github.com/Ondeoma/ts-rebuild) to rebuild the program where necessary.
