import ts from "typescript";
import { ContextBag } from "../common";
import { MacroCallExpression } from "../expansion";
import { getRootSymbol, isNodeDescendant } from "../utils";
import {
  createDiagnosticForMacroCall,
  DiagnosticMessage,
} from "../diagnosticMessages";

export function validateMacroScope(
  context: ContextBag,
  macroCall: MacroCallExpression,
) {
  const visitor = (node: ts.Node) => {
    if (
      ts.isIdentifier(node) &&
      isScopeReferenceIdentifier(node, macroCall.macroDefinition)
    ) {
      if (!isAccessible(context, node, macroCall)) {
        const diag = createDiagnosticForMacroCall(
          macroCall.rootCall,
          DiagnosticMessage.InaccessibleIdentifier,
        );
        context.extra.addDiagnostic(diag);
      }
    }

    ts.forEachChild(node, visitor);
  };

  ts.forEachChild(macroCall.macroDefinition, visitor);
}

function isAccessible(
  context: ContextBag,
  identifier: ts.Identifier,
  macroCall: MacroCallExpression,
): boolean {
  const symbolInDef = context.checker.getSymbolAtLocation(identifier);
  if (!symbolInDef) {
    const diag = createDiagnosticForMacroCall(
      macroCall.rootCall,
      DiagnosticMessage.IdentifierWithNoSymbol,
    );
    context.extra.addDiagnostic(diag);
    return true;
  }
  const rootSymbolInDef = getRootSymbol(symbolInDef, context.checker);
  const declarations = rootSymbolInDef.getDeclarations();

  const isInternal = declarations?.some((decl) =>
    isNodeDescendant(decl, macroCall.macroDefinition),
  );
  if (isInternal) {
    return true;
  }

  if (declarations && 0 < declarations.length) {
    const declFile = declarations[0]!.getSourceFile();
    const callFile = macroCall.rootCall.getSourceFile();
    if (declFile.fileName === callFile.fileName) {
      return true;
    }
  }

  const resolvedSymbol = context.checker.resolveName(
    identifier.text,
    macroCall.rootCall,
    ts.SymbolFlags.Type | ts.SymbolFlags.Value | ts.SymbolFlags.Namespace,
    false,
  );
  if (
    resolvedSymbol &&
    getRootSymbol(resolvedSymbol, context.checker) === rootSymbolInDef
  ) {
    return true;
  }

  return false;
}

function isScopeReferenceIdentifier(
  node: ts.Identifier,
  root: ts.Node,
): boolean {
  const parent = node.parent;
  if (parent === root) return true;

  if (ts.isPropertyAccessExpression(parent) && parent.name === node)
    return false;

  if (ts.isQualifiedName(parent) && parent.right === node) return false;

  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isPropertyDeclaration(parent) && parent.name === node) return false;
  if (ts.isPropertySignature(parent) && parent.name === node) return false;
  if (ts.isMethodDeclaration(parent) && parent.name === node) return false;
  if (ts.isMethodSignature(parent) && parent.name === node) return false;
  if (ts.isGetAccessor(parent) && parent.name === node) return false;
  if (ts.isSetAccessor(parent) && parent.name === node) return false;

  if (ts.isEnumMember(parent) && parent.name === node) return false;

  return true;
}
