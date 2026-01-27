import ts from "typescript";

export function getOriginalRootSymbol(
  node: ts.Node,
  checker: ts.TypeChecker,
): ts.Symbol | undefined {
  const sym = checker.getSymbolAtLocation(ts.getOriginalNode(node));
  return sym && getRootSymbol(sym, checker);
}

export function getRootSymbol(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
): ts.Symbol {
  return symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

export function isObjectType(type: ts.Type): type is ts.ObjectType {
  return (type.flags & ts.TypeFlags.Object) !== 0;
}
export function isTypeReference(type: ts.ObjectType): type is ts.TypeReference {
  return (type.objectFlags & ts.ObjectFlags.Reference) !== 0;
}
