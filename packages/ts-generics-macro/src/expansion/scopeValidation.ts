import ts from "typescript";
import { ContextBag, MacroCallExpression, MacroMap } from "../common";
import { findFirstAncestor, getRootSymbol, isNodeDescendant } from "../utils";
import { createDiagnostic, DiagnosticMessage } from "../diagnosticMessages";

export function validateMacroScope(
  context: ContextBag,
  macroCall: MacroCallExpression,
  macroMap: MacroMap,
) {
  const visitor = (node: ts.Node) => {
    if (
      ts.isIdentifier(node) &&
      isScopeReferenceIdentifier(node, macroCall.macroDefinition)
    ) {
      if (!isAccessible(context, node, macroCall, macroMap)) {
        const diag = createDiagnostic(
          macroCall.rootCall,
          DiagnosticMessage.InaccessibleIdentifier(node),
          macroCall.stackTrace(),
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
  macroMap: MacroMap,
): boolean {
  const symbolInDef = context.checker.getSymbolAtLocation(identifier);
  if (!symbolInDef) {
    const diag = createDiagnostic(
      macroCall.rootCall,
      DiagnosticMessage.IdentifierWithNoSymbol(identifier),
      macroCall.stackTrace(),
    );
    context.extra.addDiagnostic(diag);
    return true;
  }
  const rootSymbolInDef = getRootSymbol(symbolInDef, context.checker);

  // Macros will be expanded and its identifier will not be accessed.
  if (macroMap.has(rootSymbolInDef)) {
    return true;
  }

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

function isLocalExportSpecifier(specifier: ts.ExportSpecifier): boolean {
  const namedExports = specifier.parent;
  if (!namedExports || !ts.isNamedExports(namedExports)) return false;

  const exportDecl = namedExports.parent;
  return (
    !!exportDecl &&
    ts.isExportDeclaration(exportDecl) &&
    !exportDecl.moduleSpecifier
  );
}

function isImportTypeQualifier(node: ts.Node, root: ts.Node): boolean {
  const nonQualifierAncestor = findFirstAncestor(
    node,
    (current) => !ts.isQualifiedName(current),
    (current) => current === root || ts.isSourceFile(current),
  );

  return (
    !!nonQualifierAncestor &&
    ts.isImportTypeNode(nonQualifierAncestor) &&
    nonQualifierAncestor.qualifier !== undefined
  );
}

export function isScopeReferenceIdentifier(
  node: ts.Identifier,
  root: ts.Node,
): boolean {
  const parent = node.parent;
  if (parent === root) return true;

  if ("name" in parent && parent.name === node) {
    // Exceptions: reference to local vars
    // { val }
    if (ts.isShorthandPropertyAssignment(parent)) return true;
    // export { val }
    if (
      ts.isExportSpecifier(parent) &&
      !parent.propertyName &&
      isLocalExportSpecifier(parent)
    )
      return true;

    return false;
  }

  if ("propertyName" in parent && parent.propertyName === node) {
    // Exceptions:
    // `export { local as ext }`
    if (ts.isExportSpecifier(parent) && isLocalExportSpecifier(parent))
      return true;

    return false;
  }

  if ("label" in parent && parent.label === node) return false;
  if ("parameterName" in parent && parent.parameterName === node) return false;
  if ("namespace" in parent && parent.namespace === node) return false;

  // import("mod").A.B
  if (isImportTypeQualifier(node, root)) return false;

  if (ts.isQualifiedName(parent) && parent.right === node) return false;

  if (
    ts.isTypeReferenceNode(parent) &&
    node.text === "const" &&
    !parent.typeArguments
  )
    return false;

  if (
    "tagName" in parent &&
    parent.tagName === node &&
    /^[a-z]/.test(node.text) &&
    (ts.isJsxOpeningElement(parent) ||
      ts.isJsxClosingElement(parent) ||
      ts.isJsxSelfClosingElement(parent))
  ) {
    return false;
  }

  return true;
}
