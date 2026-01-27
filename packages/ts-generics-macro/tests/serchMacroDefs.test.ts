import ts from 'typescript';
import { describe, expect, test } from "vitest";
import { createMockExtra, createProgramForDirectory } from './util';
import type { TransformerExtras } from "ts-patch";

import { macroDefinitionSearchTransformer, MacroSearchOptions } from '../src/definitionSearch';
import { MacroDefinition } from '../src/common';


function defMatch(dir: string, expected: string[]) {
    const projectRoot = "../test-fixtures";
    const program = createProgramForDirectory(projectRoot, dir);

    const macroMap = new Map<ts.Symbol, MacroDefinition>();
    const searchOptions: MacroSearchOptions = {
      globalOptions: {
        macroSuffix: "$macro$",
      },
      macroMap,
    }
    const extra: TransformerExtras = createMockExtra();
    const factory = macroDefinitionSearchTransformer(program, searchOptions, extra);

    const _transformationResult = ts.transform(
      program
        .getSourceFiles()
        .filter(file => !file.isDeclarationFile),
      [factory],
      program.getCompilerOptions(),
    )

    const actual = Array.from(
        macroMap.keys(),
        (sym) => sym.name
      );

    expect(actual.toSorted()).toEqual(expected.toSorted());
}


describe("Macro defs searching", () => {
  test("simple-macro", () => defMatch("simple-macro", ["true$macro$", "add$macro$"]));
  test("generics-macro", () => defMatch("generics-macro", ["array$macro$", "push$macro$", "nested$macro$"]));
});