import ts from "typescript";

type IEnforceMembersImplement<T, I> = {
  [K in keyof T]: T[K] extends I ? T[K] : never;
};

export function enforceMembersImplement<I>() {
  return function <T extends IEnforceMembersImplement<T, I>>(members: T): T {
    return members;
  };
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
interface PrimitiveRef<T extends Primitive> {
  value: T;
}

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
