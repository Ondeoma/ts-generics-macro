// macro definitions
function array$macro$<T>(): T[] {
  return new Array<T>();
}
function push$macro$<T extends Push<V>, V>(
  arr: T,
  value: V,
): number {
  return arr.push(value);
}
function nested$macro$<NT>(): NT[] {
  return array$macro$<NT>();
}

// macro call in generics function.
// Note that type param T cannot be resolved at the time of macro expansion.
function genericFn<FT>(): FT[] {
  return nested$macro$<FT>();
}

interface Push<T> {
  push(value: T): number;
}


// using macro.
const arr = array$macro$<number>();
const index0 = push$macro$<Array<number>, number>(arr, 0);
const index1 = push$macro$<typeof arr, number>(arr, 1);
const index2 = push$macro$(arr, 2);

const arr2 = nested$macro$<number>();
