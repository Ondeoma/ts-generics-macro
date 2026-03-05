import { Wrapped, exportedType$macro$, hello$macro$, someNumber } from "./def";

(function (): string {
  return "hello!"
})();
(function (): Wrapped<number> {
  return {
    value: someNumber,
  };
})();
