function fn<T>() {}

function mc$macro$<T>() {
  fn<T>();
}

type F0 = () => void;
type O = {
  p: () => void;
};

mc$macro$<F0>();
mc$macro$<O>();
