export function hello$macro$(): string {
  throw "This is macro. Call of this function should have been expanded at compile time.";
}

export interface Wrapped<T> {
  value: T;
}
export const someNumber = 42;
export function exportedType$macro$(): Wrapped<number> {
  throw "This is macro. Call of this function should have been expanded at compile time.";
}
