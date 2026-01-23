interface Push<T> {
  push(value: T): number;
}


// using macro.
const arr = (function (): number[] {
  return new Array<number>();
})();
const index0 = (function (
  arr: number[],
  value: number,
): number {
  return arr.push(value);
})(arr, 0);
const index1 = (function (
  arr: number[],
  value: number,
): number {
  return arr.push(value);
})(arr, 1);
const index2 = (function (
  arr: number[],
  value: number,
): number {
  return arr.push(value);
})(arr, 2);
