import ts from 'typescript';

export interface Options {
  macroSuffix: string;
}


export interface ContextBag {
  options: Options;
  diagnostics: ts.Diagnostic[];

  program: ts.Program;
  compilerOptions: ts.CompilerOptions;
  checker: ts.TypeChecker;
  printer: ts.Printer;
  transformer: ts.TransformationContext;
}



export function isMacroIdent(name: ts.MemberName, options: Options): boolean {
  return name.text.endsWith(options.macroSuffix);
}


export interface MacroDefinitionMarker {}  // just marker
export type MacroDefinition = ts.FunctionDeclaration & MacroDefinitionMarker

export function isMacroDefinition(node: ts.Node, options: Options): node is MacroDefinition {
  return ts.isFunctionDeclaration(node)
    && node.name !== undefined
    && isMacroIdent(node.name, options)
    && !node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DeclareKeyword)
}

