import ts from "typescript";
import type { TransformerExtras } from "ts-patch";

import {
  createDiagnosticForMacroDef,
  DiagnosticMessage,
} from "./diagnosticMessages";
import { ContextBag, isMacroDefinition, MacroMap, Options } from "./common";
import { getOriginalRootSymbol } from "./utils";

function createMacroDefinitionSearchVisitor(
  context: ContextBag,
  result: MacroMap,
): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node) => {
    if (isMacroDefinition(node, context.options)) {
      const symbol =
        node.name && getOriginalRootSymbol(node.name, context.checker);
      if (!symbol) {
        const diag: ts.DiagnosticWithLocation = createDiagnosticForMacroDef(
          node,
          DiagnosticMessage.MacroDefWithNoNameSymbol,
        );
        context.extra.addDiagnostic(diag);
      } else {
        result.set(symbol, node);
      }
      return undefined;
    } else {
      return ts.visitEachChild(node, visitor, context.transformer);
    }
  };
  return visitor;
}

export interface MacroSearchOptions extends Options {
  macroMap: MacroMap;
}

export function macroDefinitionSearchTransformer(
  program: ts.Program,
  options: MacroSearchOptions,
  extra: TransformerExtras,
): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });
  const compilerOptions = program.getCompilerOptions();

  const factory = ((transformationContext: ts.TransformationContext) =>
    (sourceFile: ts.SourceFile) => {
      const context = {
        options,
        program,
        checker,
        printer,
        compilerOptions,
        transformer: transformationContext,
        extra,
      } satisfies ContextBag;
      const visitor = createMacroDefinitionSearchVisitor(
        context,
        options.macroMap,
      );
      return (
        ts.visitNode(sourceFile, visitor, ts.isSourceFile) ??
        ts.factory.updateSourceFile(sourceFile, [])
      );
    }) satisfies ts.TransformerFactory<ts.SourceFile>;

  return factory;
}
