import ts from "typescript";
import { ContextBag } from "../common";

export function createCommentOmissionVisitor(context: ContextBag): ts.Visitor {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    const visited = ts.visitEachChild(node, visitor, context.transformer);
    return ts.setEmitFlags(visited, ts.EmitFlags.NoComments);
  };
  return visitor;
}

export function omitComments<T extends ts.Node>(
  context: ContextBag,
  node: T,
): T {
  const visitor = createCommentOmissionVisitor(context);
  const visited = ts.visitEachChild(node, visitor, context.transformer);
  return ts.setEmitFlags(visited, ts.EmitFlags.NoComments);
}
