import ts from 'typescript';
import { describe, expect, test } from "vitest";
import { createProgramForDirectory } from './util';

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
    macroDefinitionSearchTransformer(program, searchOptions);

    const actual = Array.from(
        macroMap.keys(),
        (sym) => sym.name
      ).toSorted();
    const expected = ["true$macro$", "add$macro$"].toSorted();

    expect(actual).toEqual(expected);
  });
});