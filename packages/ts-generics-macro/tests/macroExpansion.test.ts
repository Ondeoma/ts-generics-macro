import ts from 'typescript';
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createMockExtra, createProgramForDirectory, getSortedSources, printDiagnostics } from './util';
import type { TransformerExtras } from "ts-patch";

import { macroDefinitionSearchTransformer, MacroSearchOptions } from '../src/definitionSearch';
import { macroExpansionTransformer, MacroExpansionOptions } from '../src/expansion';
import { MacroDefinition } from '../src/common';


function matchExpansion(dir: string, expectedDir: string) {
  const projectRoot = "../test-fixtures";
  const program = createProgramForDirectory(projectRoot, dir);

  const macroMap = new Map<ts.Symbol, MacroDefinition>();
  const searchOptions: MacroSearchOptions = {
    globalOptions: {
      macroSuffix: "$macro$",
    },
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
  )
  const transformedSources = transformationResult.transformed
    .toSorted((a: ts.SourceFile, b: ts.SourceFile): number => a.fileName === b.fileName ? 0 : a.fileName < b.fileName ? -1 : +1);

  const expectedSources = createProgramForDirectory(projectRoot, expectedDir).getSourceFiles()
    .toSorted((a: ts.SourceFile, b: ts.SourceFile): number => a.fileName === b.fileName ? 0 : a.fileName < b.fileName ? -1 : +1);

  printDiagnostics(extra.diagnostics)

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


describe("Macro expansion", () => {
  test("simple-macro", () => matchExpansion("simple-macro", "simple-macro-expected"));
  test("generics-macro", () => matchExpansion("generics-macro", "generics-macro-expected"));
  test("complex-typed-macro", () => matchExpansion("complex-typed-macro", "complex-typed-macro-expected"));
});