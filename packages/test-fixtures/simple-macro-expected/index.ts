
// These are not macro.
function nonMacroFunc() {
  return false;
}
const nonMacroClosure = () => {
  return false;
}
const nonMacro$macro$ = () => {
  return false;
}


// using macro.
console.log(
  (function () {
    return true;
  })()
);
console.log(
  (function (
    a: number,
    b: number,
  ): number {
    return a + b;
  })(1, 2)
);
