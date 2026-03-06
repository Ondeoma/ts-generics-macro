import ts, { isCallExpression } from "typescript";
import type { TransformerExtras } from "ts-patch";

import { ContextBag, MacroCallExpression, MacroMap, Options } from "./common";
import { getOriginalRootSymbol } from "./utils";
import {
  expandTypeArguments,
  extractTypeMap,
  TypeMap,
} from "./expansion/typeExpansion";
import { omitComments } from "./expansion/commentOmission";
import { createStripOriginalVisitor } from "./expansion/originalStripping";
import { validateMacroScope } from "./expansion/scopeValidation";

function extractMacroCallExpression(
  node: ts.Node,
  macroMap: MacroMap,
  parentCall: MacroCallExpression | undefined,
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
  return new MacroCallExpression(node, macroDefinition, parentCall);
}

function createMacroExpansionVisitor(
  context: ContextBag,
  macroMap: MacroMap,
  parentCall?: MacroCallExpression,
  parentTypeMap: TypeMap = new Map(),
): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node) => {
    const macroCall = extractMacroCallExpression(
      node,
      macroMap,
      parentCall,
      context.checker,
    );
    if (!macroCall) {
      return ts.visitEachChild(node, visitor, context.transformer);
    }

    validateMacroScope(context, macroCall);
    const typeMap = extractTypeMap(context, macroCall, parentTypeMap);

    const modifiers = macroCall.macroDefinition.modifiers?.filter(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword,
    );

    const reccurentVisitor = createMacroExpansionVisitor(
      context,
      macroMap,
      macroCall,
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
      (func: ts.FunctionExpression) =>
        ts.visitEachChild(
          func,
          createStripOriginalVisitor(context),
          context.transformer,
        ),
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
