export interface Wrapped<T> {
  value: T;
}
export const someNumber = 42;
export function exportedType$macro$(): Wrapped<number> {
  return {
    value: someNumber,
  };
}
