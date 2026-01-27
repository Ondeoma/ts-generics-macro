import ts from "typescript";
import { MacroExpansionOptions, macroExpansionTransformer } from "./expansion";
import { TransformerExtras } from "ts-patch";
import { composedTransformer } from "./utils";
import { macroDefinitionSearchTransformer } from "./definitionSearch";

export function macroTransformer(
  program: ts.Program,
  options: MacroExpansionOptions,
  extra: TransformerExtras,
): ts.TransformerFactory<ts.SourceFile> {
  return composedTransformer(program, [
    macroDefinitionSearchTransformer(program, options, extra),
    macroExpansionTransformer(program, options, extra),
  ]);
}
