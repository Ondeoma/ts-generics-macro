// macro definitions
function m1$macro$<T1>(
  arg: T1,
) {
  // T2 = T1[]
  m2$macro$([arg]);

  // T2 = {a: string, b: T1}
  const obj = {
    a: "a",
    b: arg,
  };
  m2$macro$(obj);

  /*
  type TObj = typeof obj;
  m2$macro$<TObj>(obj);

  // T2 = {b: T1}
  m2$macro$<Omit<typeof obj, "a">>(obj);
  */
}

function m2$macro$<T2>(
  arg: T2,
): T2[] {
  return new Array<T2>();
}

// macro use
function genericFn<T>(arg: T) {
  m1$macro$<T>(arg);
}

genericFn(1);
m1$macro$(1);
