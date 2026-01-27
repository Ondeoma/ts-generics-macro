import ts from "typescript";
import { ContextBag } from "../common";
import { getOriginalRootSymbol, isObjectType, isTypeReference } from "../utils";
import { MacroCallExpression } from "../expansion";
import {
  createDiagnosticForMacroCall,
  DiagnosticMessage,
} from "../diagnosticMessages";

export type TypeMap = Map<ts.Symbol, ts.TypeNode>;

export function createTypeExpansionVisitor(
  context: ContextBag,
  typeMap: TypeMap,
): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    if (ts.isTypeReferenceNode(node)) {
      const refSymbol = getOriginalRootSymbol(node.typeName, context.checker);
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

export function extractTypeMap(
  context: ContextBag,
  macroCall: MacroCallExpression,
  parentTypeMap: TypeMap,
): TypeMap {
  const signature = context.checker.getResolvedSignature(
    macroCall.callExpression,
  );
  if (!signature) {
    return parentTypeMap;
  }
  const typeParams = macroCall.macroDefinition.typeParameters;
  const typeArgs =
    context.checker.getTypeArgumentsForResolvedSignature(signature);

  if (!typeParams) {
    return parentTypeMap;
  }
  if (typeArgs === undefined || typeParams.length != typeArgs.length) {
    const diag = createDiagnosticForMacroCall(
      macroCall.callExpression,
      DiagnosticMessage.MacroCallTypeArgsMismatch,
    );
    context.extra.addDiagnostic(diag);
    return parentTypeMap;
  }

  const typeParamSymbols = typeParams
    .map((tParam) => getOriginalRootSymbol(tParam.name, context.checker))
    .filter((tParamSym) => !!tParamSym);
  if (typeParamSymbols.length < typeParams.length) {
    const diag = createDiagnosticForMacroCall(
      macroCall.callExpression,
      DiagnosticMessage.MacroTypeParamWithNoSymbol,
    );
    context.extra.addDiagnostic(diag);
    return parentTypeMap;
  }

  const typeArgNodes = typeArgs.map((tArg) =>
    applyTypeMapOnType(tArg, context, parentTypeMap, macroCall.callExpression),
  );

  const currentTypeMap = new Map(
    typeParamSymbols.map((tParamSym, index) => [
      tParamSym,
      typeArgNodes[index]!,
    ]),
  );
  const typeMap = new Map([...parentTypeMap, ...currentTypeMap]);
  return typeMap;
}

/*
To get inferred types, we need `checker.getTypeArgumentsForResolvedSignature` which returns `ts.Type[] | undefined`.
`ts.Type` can be converted to `ts.Node` with `checker.typeToTypeNode`.
But it looks like removes their symbols which is needed to expand types.
So we visit `ts.Type` instead of convinient `ts.Node`.
*/
function applyTypeMapOnType(
  t: ts.Type,
  context: ContextBag,
  parentTypeMap: TypeMap,
  node: ts.Node,
): ts.TypeNode {
  // recursively apply this
  if (t.isTypeParameter() && t.symbol && parentTypeMap.has(t.symbol)) {
    return parentTypeMap.get(t.symbol)!;
  }

  // for alias
  if (
    t.aliasSymbol &&
    t.aliasTypeArguments &&
    t.aliasTypeArguments.length > 0
  ) {
    const newTypeArguments = t.aliasTypeArguments.map((argType) =>
      applyTypeMapOnType(argType, context, parentTypeMap, node),
    );
    return ts.factory.createTypeReferenceNode(
      t.aliasSymbol.name,
      newTypeArguments,
    );
  }

  // for reference like Array<T>
  if (isObjectType(t) && isTypeReference(t)) {
    const typeArgs = context.checker.getTypeArguments(t);
    if (0 < typeArgs.length) {
      const newTypeArguments = typeArgs.map((argType) =>
        applyTypeMapOnType(argType, context, parentTypeMap, node),
      );
      const targetName = t.symbol.name;
      return ts.factory.createTypeReferenceNode(targetName, newTypeArguments);
    }
  }

  // for object literal
  if (isObjectType(t) && t.objectFlags & ts.ObjectFlags.Anonymous) {
    return applyTypeMapOnObjectType(t, context, parentTypeMap, node);
  }

  if (t.isUnion()) {
    const newTypes = t.types.map((t) =>
      applyTypeMapOnType(t, context, parentTypeMap, node),
    );
    return ts.factory.createUnionTypeNode(newTypes);
  }

  if (t.isIntersection()) {
    const newTypes = t.types.map((t) =>
      applyTypeMapOnType(t, context, parentTypeMap, node),
    );
    return ts.factory.createIntersectionTypeNode(newTypes);
  }

  return context.checker.typeToTypeNode(
    t,
    node,
    ts.NodeBuilderFlags.NoTruncation,
  )!;
}

function applyTypeMapOnObjectType(
  type: ts.ObjectType,
  context: ContextBag,
  parentTypeMap: Map<ts.Symbol, ts.TypeNode>,
  node: ts.Node,
): ts.TypeLiteralNode {
  const properties = type.getProperties();

  const members: ts.TypeElement[] = properties.map((propSymbol) => {
    const isOptional = (propSymbol.flags & ts.SymbolFlags.Optional) !== 0;
    const propType = context.checker.getTypeOfSymbolAtLocation(
      propSymbol,
      node,
    );
    const typeNode = applyTypeMapOnType(propType, context, parentTypeMap, node);

    return ts.factory.createPropertySignature(
      undefined,
      propSymbol.name,
      isOptional
        ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
        : undefined,
      typeNode,
    );
  });

  // TODO: index signature ... ([key: string]: any)
  // const indexInfos = checker.getIndexInfosOfType(type); ...

  return ts.factory.createTypeLiteralNode(members);
}

export function expandTypeArguments(
  context: ContextBag,
  func: ts.FunctionExpression,
  typeMap: TypeMap,
): ts.FunctionExpression {
  if (typeMap.size === 0) {
    return func;
  }
  const replacementVisitor = createTypeExpansionVisitor(context, typeMap);

  const newParams = func.parameters
    .map((param) => ts.visitNode(param, replacementVisitor))
    .filter((node) => !!node && ts.isParameter(node));
  const newReturnType = ts.visitNode(func.type, replacementVisitor);
  const newBody = ts.visitNode(func.body, replacementVisitor);
  if (newParams.length !== func.parameters.length) {
    throw "Failed to expand type arguments. Number of parameters has been changed. This is a bug of the transformer.";
  }
  if (
    !(newReturnType && ts.isTypeNode(newReturnType)) &&
    !(!func.type && !newReturnType)
  ) {
    throw "Failed to expand type arguments. Returned return-type was not type node. This is a bug of the transformer.";
  }
  if (!newBody || !ts.isBlock(newBody)) {
    throw "Failed to expand type arguments. Returned function body is not block. This is a bug of the transformer.";
  }

  const newFunc = ts.factory.createFunctionExpression(
    func.modifiers,
    func.asteriskToken,
    func.name,
    undefined, // type params is expanded
    newParams,
    newReturnType,
    newBody,
  );

  return newFunc;
}
