import ts from 'typescript';
import { describe, expect, test } from "vitest";
import { createMockExtra, createProgramForDirectory } from './util';
import type { TransformerExtras } from "ts-patch";

import { macroDefinitionSearchTransformer, MacroSearchOptions } from '../src/definitionSearch';
import { MacroDefinition } from '../src/common';


describe("Macro defs searching", () => {
  test("simple-macro", () => {
    const projectRoot = "../test-fixtures";
    const program = createProgramForDirectory(projectRoot, "simple-macro");

    const macroMap = new Map<ts.Symbol, MacroDefinition>();
    const searchOptions: MacroSearchOptions = {
      globalOptions: {
        macroSuffix: "$macro$",
      },
      macroMap,
    }
    const extra: TransformerExtras = createMockExtra();
    const factory = macroDefinitionSearchTransformer(program, searchOptions, extra);

    const transformationResult = ts.transform(
      program
        .getSourceFiles()
        .filter(file => !file.isDeclarationFile),
      [factory],
      program.getCompilerOptions(),
    )

    const actual = Array.from(
        macroMap.keys(),
        (sym) => sym.name
      ).toSorted();
    const expected = ["true$macro$", "add$macro$"].toSorted();

    expect(actual).toEqual(expected);
  });
});