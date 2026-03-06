import ts from 'typescript';
import { describe, expect, test } from "vitest";
import { createMockExtra, createProgramForDirectory, printDiagnostics } from './util';
import type { TransformerExtras } from "ts-patch";

import { macroDefinitionSearchTransformer, MacroSearchOptions } from '../src/definitionSearch';
import { macroExpansionTransformer, MacroExpansionOptions } from '../src/expansion';
import { MacroDefinition } from '../src/common';


const projectRoot = "../test-fixtures";

function transform(dir: string): {
  diagnostics: readonly ts.Diagnostic[],
  result: ts.TransformationResult<ts.SourceFile>,
} {
    const program = createProgramForDirectory(projectRoot, dir);

  const macroMap = new Map<ts.Symbol, MacroDefinition>();
  const searchOptions: MacroSearchOptions = {
    macroSuffix: "$macro$",
    macroMap,
  };
  const expansionOptions: MacroExpansionOptions = searchOptions;
  const extra: TransformerExtras = createMockExtra();

  const factories = [
    macroDefinitionSearchTransformer(program, searchOptions, extra),
    macroExpansionTransformer(program, expansionOptions, extra),
  ];

  const transformationResult = ts.transform(
    program
      .getSourceFiles()
      .filter(file => !file.isDeclarationFile),
    factories,
    program.getCompilerOptions(),
  );

  return {
    diagnostics: extra.diagnostics,
    result: transformationResult,
  }
}

function matchExpansion(dir: string, expectedDir: string) {
  const {result: transformationResult, diagnostics} = transform(dir);
  const transformedSources = transformationResult.transformed
    .toSorted((a: ts.SourceFile, b: ts.SourceFile): number => a.fileName === b.fileName ? 0 : a.fileName < b.fileName ? -1 : +1);

  const expectedSources = createProgramForDirectory(projectRoot, expectedDir).getSourceFiles()
    .toSorted((a: ts.SourceFile, b: ts.SourceFile): number => a.fileName === b.fileName ? 0 : a.fileName < b.fileName ? -1 : +1);

  printDiagnostics(diagnostics)
  const errors = diagnostics.filter(diag => diag.category === ts.DiagnosticCategory.Error);
  expect(errors.length).toBe(0);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  transformedSources
    .map<[ts.SourceFile, ts.SourceFile]>((value, index) => [
      value,
      expectedSources[index]!,
    ])
    .forEach(([transformed, expected]) => {
      expect(printer.printFile(transformed)).equals(printer.printFile(expected));
    });
}

function expectDiagnostics(dir: string, codes: number[]) {
  const {diagnostics} = transform(dir);
  const actualCodes = diagnostics.map(diag => diag.code);
  expect(actualCodes).toEqual(expect.arrayContaining(codes));
}

describe("Macro expansion", () => {
  test("simple-macro", () => matchExpansion("simple-macro", "simple-macro-expected"));
  test("generics-macro", () => matchExpansion("generics-macro", "generics-macro-expected"));
  test("complex-typed-macro", () => matchExpansion("complex-typed-macro", "complex-typed-macro-expected"));
  test("inter-file-call", () => matchExpansion("inter-file-call", "inter-file-call-expected"));
  test("func-type-expansion", () => matchExpansion("func-type-expansion", "func-type-expansion-expected"));

  test("inaccessible-identifier", () => expectDiagnostics("inaccessible-identifier", [24104]));
});
