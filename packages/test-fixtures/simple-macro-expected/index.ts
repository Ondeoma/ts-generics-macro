
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

// These are macro.
function true$macro$() {
  throw "This is macro. Call of this function should have been expanded at compile time.";
}
function add$macro$(
  a: number,
  b: number,
): number {
  throw "This is macro. Call of this function should have been expanded at compile time.";
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
