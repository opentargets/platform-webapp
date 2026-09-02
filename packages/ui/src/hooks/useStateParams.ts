import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

function useStateParams<T>(
  initialState: T,
  paramsName: string,
  serialize: (state: T) => string,
  deserialize: (state: string) => T
): [T, (state: T) => void] {
  const navigate = useNavigate();
  const location = useLocation();
  const search = new URLSearchParams(location.search);

  const existingValue = search.get(paramsName);
  const [state, setState] = useState<T>(existingValue ? deserialize(existingValue) : initialState);

  useEffect(() => {
    // Updates state when user navigates backwards or forwards in browser history
    if (existingValue && deserialize(existingValue) !== state) {
      setState(deserialize(existingValue));
    } else if (!existingValue) setState(initialState);
  }, [existingValue]);

  const onChange = (s: T) => {
    setState(s);
    const searchParams = new URLSearchParams(location.search);
    searchParams.set(paramsName, serialize(s));
    const { pathname } = location;
    navigate({ pathname, search: searchParams.toString() });
  };

  return [state, onChange];
}

export default useStateParams;
