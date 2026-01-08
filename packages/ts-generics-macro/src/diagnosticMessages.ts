import ts from 'typescript'
import { enforceMembersImplement } from './utils';

interface IDiagnosticMessage {
  category: ts.DiagnosticCategory,
  messageText: string,
  code: number,
}


/*
  This function is from typescript internal.
*/
export function getSourceFileOfNode(node: ts.Node): ts.SourceFile;
export function getSourceFileOfNode(node: ts.Node | undefined): ts.SourceFile | undefined;
export function getSourceFileOfNode(node: ts.Node | undefined): ts.SourceFile | undefined {
  while (node && node.kind !== ts.SyntaxKind.SourceFile) {
    node = node.parent;
  }
  return node as ts.SourceFile;
}

export function createDiagnosticForMacroDef(node: ts.FunctionDeclaration, message: IDiagnosticMessage): ts.DiagnosticWithLocation {
  return {
    file: getSourceFileOfNode(node),
    start: node.pos,
    length: node.end - node.pos,
    ...message,
  }
}

export const DiagnosticMessage = {
  MacroDefWithNoNameSymbol: {
    category: ts.DiagnosticCategory.Error,
    messageText: "Macro definition with no name symbol.",
    code: 24000,
  },
  MacroDefsInMacro: {
    category: ts.DiagnosticCategory.Error,
    messageText: "Cannot define macros in another macro definition.",
    code: 24001,
  },
  /*
    To be precise, inside a generic function definition,
    the type parameters must not be used in a macro definition.
  */
  MacroDefsInGenericFunc: {
    category: ts.DiagnosticCategory.Error,
    messageText: "Cannot define macros in a generic function definition.",
    code: 24002,
  },
};
enforceMembersImplement<IDiagnosticMessage>()(DiagnosticMessage);
