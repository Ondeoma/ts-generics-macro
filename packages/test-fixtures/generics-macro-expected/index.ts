// macro call in generics function.
// Note that type param T cannot be resolved at the time of macro expansion.
function genericFn<FT>(): FT[] {
  return (function (): FT[] {
    return (function (): FT[] {
      return new Array<FT>();
    })();
  })();
}

interface Push<T> {
  push(value: T): number;
}


// using macro.
const arr = (function (): number[] {
  return new Array<number>();
})();
const index0 = (function (
  arr: Array<number>,
  value: number,
): number {
  return arr.push(value);
})(arr, 0);
const index1 = (function (
  arr: Array<number>,
  value: number,
): number {
  return arr.push(value);
})(arr, 1);
const index2 = (function (
  arr: Array<number>,
  value: number,
): number {
  return arr.push(value);
})(arr, 2);

const arr2 = (function (): number[] {
  return (function (): number[] {
    return new Array<number>();
  })();
})();