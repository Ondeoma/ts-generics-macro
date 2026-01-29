import ts from "typescript";
import { MacroExpansionOptions, macroExpansionTransformer } from "./expansion";
import { TransformerExtras } from "ts-patch";
import { composedTransformer, RecursivePartial } from "./utils";
import {
  macroDefinitionSearchTransformer,
  MacroSearchOptions,
} from "./definitionSearch";

type MacroOptions = RecursivePartial<
  Omit<MacroSearchOptions & MacroExpansionOptions, "macroMap">
>;

export default function macroTransformer(
  program: ts.Program,
  options: MacroOptions,
  extra: TransformerExtras,
): ts.TransformerFactory<ts.SourceFile> {
  const defaultOptisons: MacroSearchOptions & MacroExpansionOptions = {
    macroSuffix: "$macro$",
    macroMap: new Map(),
  };
  const exactOptions = {
    ...options,
    ...defaultOptisons,
  };

  return composedTransformer(program, [
    macroDefinitionSearchTransformer(program, exactOptions, extra),
    macroExpansionTransformer(program, exactOptions, extra),
  ]);
}
