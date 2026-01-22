
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
  return true;
}
function add$macro$(
  a: number,
  b: number,
): number {
  return a + b;
}


// using macro.
console.log(true$macro$());
console.log(add$macro$(1, 2));
