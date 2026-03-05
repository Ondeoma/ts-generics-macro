function fn<T>() {}

function mc$macro$<T>() {
  throw "This is macro. Call of this function should have been expanded at compile time.";
}

type F0 = () => void;
type O = {
  p: () => void;
};

(function () {
    fn<() => void>();
})();
(function () {
    fn<{
        p: () => void;
    }>();
})();
