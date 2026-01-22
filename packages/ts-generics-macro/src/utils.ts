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

export function getRootSymbol(symbol: ts.Symbol, checker: ts.TypeChecker,): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(symbol) : symbol;
}