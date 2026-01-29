import ts, { isCallExpression } from "typescript";
import type { TransformerExtras } from "ts-patch";

import { ContextBag, MacroDefinition, MacroMap, Options } from "./common";
import { getOriginalRootSymbol } from "./utils";
import {
  expandTypeArguments,
  extractTypeMap,
  TypeMap,
} from "./expansion/typeExpansion";
import { omitComments } from "./expansion/commentOmission";

export type MacroCallExpression = {
  callExpression: ts.CallExpression;
  macroDefinition: MacroDefinition;
};
function extractMacroCallExpression(
  node: ts.Node,
  macroMap: MacroMap,
  checker: ts.TypeChecker,
): MacroCallExpression | undefined {
  if (!isCallExpression(node)) {
    return undefined;
  }
  const symbol = getOriginalRootSymbol(node.expression, checker);
  if (!symbol) {
    return undefined;
  }
  const macroDefinition = macroMap.get(symbol);
  if (!macroDefinition) {
    return undefined;
  }
  return {
    callExpression: node,
    macroDefinition,
  };
}

function createMacroExpansionVisitor(
  context: ContextBag,
  macroMap: MacroMap,
  parentTypeMap: TypeMap = new Map(),
): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node) => {
    const macroCall = extractMacroCallExpression(
      node,
      macroMap,
      context.checker,
    );
    if (!macroCall) {
      return ts.visitEachChild(node, visitor, context.transformer);
    }

    const typeMap = extractTypeMap(context, macroCall, parentTypeMap);

    const modifiers = macroCall.macroDefinition.modifiers?.filter(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword,
    );

    const reccurentVisitor = createMacroExpansionVisitor(
      context,
      macroMap,
      typeMap,
    );
    const body = ts.visitEachChild(
      macroCall.macroDefinition.body!,
      reccurentVisitor,
      context.transformer,
    );
    if (!body || !ts.isBlock(body)) {
      throw "Failed to expand macro body. Returned value is not expected type of node. This is a bug of the transformer.";
    }

    const baseFuncExpression = ts.factory.createFunctionExpression(
      modifiers, // only needed modifiers
      macroCall.macroDefinition.asteriskToken,
      undefined, // remove name
      macroCall.macroDefinition.typeParameters,
      macroCall.macroDefinition.parameters,
      macroCall.macroDefinition.type,
      body,
    );

    const funcExpression = [
      (func: ts.FunctionExpression) => omitComments(context, func),
      (func: ts.FunctionExpression) =>
        expandTypeArguments(context, func, typeMap),
    ].reduce((func, f) => f(func), baseFuncExpression);

    const iife = ts.factory.createCallExpression(
      ts.factory.createParenthesizedExpression(funcExpression),
      undefined, // type args should be expanded
      macroCall.callExpression.arguments,
    );

    const expanded = ts.setEmitFlags(iife, ts.EmitFlags.NoComments);
    return expanded;
  };
  return visitor;
}

export interface MacroExpansionOptions extends Options {
  macroMap: MacroMap;
}

export function macroExpansionTransformer(
  program: ts.Program,
  options: MacroExpansionOptions,
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
      const visitor = createMacroExpansionVisitor(context, options.macroMap);
      return (
        ts.visitNode(sourceFile, visitor, ts.isSourceFile) ??
        ts.factory.updateSourceFile(sourceFile, [])
      );
    }) satisfies ts.TransformerFactory<ts.SourceFile>;

  return factory;
}
