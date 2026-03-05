import ts from "typescript";
import { ContextBag } from "../common";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Printer may fail on inter-file call if TextRange is not stripped.
export function createStripOriginalVisitor(context: ContextBag): ts.Visitor {
  const visitor = (node: ts.Node) => {
    const visited: ts.Node = ts.visitEachChild(
      node,
      visitor,
      context.transformer,
    );
    const stripped = ts.setTextRange(visited, undefined);
    // Force strip
    (stripped as any).pos = -1;
    (stripped as any).end = -1;
    if (-1 < stripped.pos || -1 < stripped.end)
      throw `Failed to strip text range: (${stripped.pos}, ${stripped.end})`;
    return stripped;
  };
  return visitor;
}
