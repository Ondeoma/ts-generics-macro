function fn<T>() {}

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
