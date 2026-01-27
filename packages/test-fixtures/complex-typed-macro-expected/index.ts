// macro use
function genericFn<T>(arg: T) {
  (function (
    arg: T,
  ) {
    (function (arg: Array<T>): Array<T>[] {
      return new Array<Array<T>>();
    })([arg]);

    const obj = {
      a: "a",
      b: arg,
    };
    (function (arg: {a: string, b: T}): {a: string, b: T}[] {
      return new Array<{a: string, b: T}>();
    })(obj);
  })(arg);
}

genericFn(1);
(function (
  arg: number,
) {
  (function (arg: Array<number>): Array<number>[] {
    return new Array<Array<number>>();
  })([arg]);

  const obj = {
    a: "a",
    b: arg,
  };
  (function (arg: {a: string, b: number}): {a: string, b: number}[] {
    return new Array<{a: string, b: number}>();
  })(obj);
})(1);
