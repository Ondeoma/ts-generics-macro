import ts from "typescript";
import type { TransformerExtras } from "ts-patch";

export interface Options {
  macroSuffix: string;
}

export interface ContextBag {
  options: Options;

  program: ts.Program;
  compilerOptions: ts.CompilerOptions;
  checker: ts.TypeChecker;
  printer: ts.Printer;
  transformer: ts.TransformationContext;
  extra: TransformerExtras;
}

export type MacroMap = Map<ts.Symbol, MacroDefinition>;

export function isMacroIdent(name: ts.MemberName, options: Options): boolean {
  return name.text.endsWith(options.macroSuffix);
}

export type MacroDefinition = ts.FunctionDeclaration & {
  __isMacroBrand: "isMacro";
};

export function isMacroDefinition(
  node: ts.Node,
  options: Options,
): node is MacroDefinition {
  return (
    ts.isFunctionDeclaration(node) &&
    node.name !== undefined &&
    isMacroIdent(node.name, options) &&
    !node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.DeclareKeyword)
  );
}
