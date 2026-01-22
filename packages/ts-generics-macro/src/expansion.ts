import ts, { isCallExpression } from "typescript";
import type { TransformerExtras } from "ts-patch";

import {
  createDiagnosticForMacroCall,
  DiagnosticMessage,
} from "./diagnosticMessages";
import { ContextBag, MacroDefinition, MacroMap, Options } from "./common";
import { getRootSymbol } from "./utils";

type MacroCallExpression = {
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
  const plainSymbol = checker.getSymbolAtLocation(node.expression);
  if (!plainSymbol) {
    return undefined;
  }
  const symbol = getRootSymbol(plainSymbol, checker);
  const macroDefinition = macroMap.get(symbol);
  if (!macroDefinition) {
    return undefined;
  }
  return {
    callExpression: node,
    macroDefinition,
  };
}

function createTypeExpansionVisitor(
  context: ContextBag,
  typeMap: Map<ts.Symbol, ts.TypeNode>,
): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    if (ts.isTypeReferenceNode(node)) {
      const refSymbol = context.checker.getSymbolAtLocation(node.typeName);
      if (refSymbol) {
        const replacement = typeMap.get(refSymbol);
        if (replacement) {
          return replacement;
        }
      }
    }
    return ts.visitEachChild(node, visitor, context.transformer);
  };
  return visitor;
}

function extractTypeMap(
  context: ContextBag,
  macroCall: MacroCallExpression,
): Map<ts.Symbol, ts.TypeNode> | undefined {
  const typeParams = macroCall.macroDefinition.typeParameters;
  const typeArgs = macroCall.callExpression.typeArguments;
  if (!typeParams && !typeArgs) {
    return undefined;
  }
  if (
    typeParams === undefined ||
    typeArgs === undefined ||
    typeParams.length != typeArgs.length
  ) {
    const diag = createDiagnosticForMacroCall(
      macroCall.callExpression,
      DiagnosticMessage.MacroCallTypeArgsMismatch,
    );
    context.extra.addDiagnostic(diag);
    return undefined;
  }

  const typeParamSymbols = typeParams
    .map((tParam) => context.checker.getSymbolAtLocation(tParam.name))
    .filter((tParamSym) => !!tParamSym);
  if (typeParamSymbols.length < typeParams.length) {
    const diag = createDiagnosticForMacroCall(
      macroCall.callExpression,
      DiagnosticMessage.MacroTypeParamWithNoSymbol,
    );
    context.extra.addDiagnostic(diag);
    return undefined;
  }

  const typeMap = new Map(
    typeParamSymbols.map((tParamSym, index) => [tParamSym, typeArgs[index]!]),
  );
  return typeMap;
}

function expandTypeArguments(
  context: ContextBag,
  macroCall: MacroCallExpression,
  body: ts.FunctionBody,
): ts.FunctionBody {
  const typeMap = extractTypeMap(context, macroCall);
  if (!typeMap) {
    return body;
  }
  const replacementVisitor = createTypeExpansionVisitor(context, typeMap);
  const visitedBody = ts.visitNode(body, replacementVisitor);
  if (!visitedBody || !ts.isBlock(visitedBody)) {
    throw "Failed to expand type arguments. Returned value is not function body. This is a bug of the transformer.";
  }
  return visitedBody;
}

function createMacroExpansionVisitor(
  context: ContextBag,
  macroMap: MacroMap,
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

    const funcBody = [
      (body: ts.FunctionBody) => expandTypeArguments(context, macroCall, body),
    ].reduce((body, f) => f(body), macroCall.macroDefinition.body!);

    const modifiers = macroCall.macroDefinition.modifiers?.filter(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword,
    );

    const funcExpression = ts.factory.createFunctionExpression(
      modifiers, // only needed modifiers
      macroCall.macroDefinition.asteriskToken,
      undefined, // remove name
      undefined, // type params should be expanded
      macroCall.macroDefinition.parameters,
      macroCall.macroDefinition.type,
      funcBody,
    );

    const iife = ts.factory.createCallExpression(
      ts.factory.createParenthesizedExpression(funcExpression),
      undefined, // type args should be expanded
      macroCall.callExpression.arguments,
    );

    const expanded = ts.setEmitFlags(iife, ts.EmitFlags.NoComments);
    return ts.visitEachChild(expanded, visitor, context.transformer);
  };
  return visitor;
}

export interface MacroExpansionOptions {
  globalOptions: Options;
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
        options: options.globalOptions,
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
