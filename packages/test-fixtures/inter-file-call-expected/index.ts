import * as def from "./def";
import { Wrapped, someNumber } from "./def";

(function (): string {
  return "hello!"
})();
(function (): Wrapped<number> {
  return {
    value: someNumber,
  };
})();
