import { useCallback, useContext, useMemo } from "react";
import { DownloadsContext } from "../context/DownloadsContext";
import { addToBasket, clearBasket, removeFromBasket, setBasketOpen } from "../context/downloadsActions";
import { getDatasetId, selectBasketRows, selectRowsById } from "../context/downloadsSelectors";
import { announce } from "./LiveRegion";

/**
 * The basket as the components use it: membership checks, toggling, bulk
 * add, and the screen-reader announcements that go with each change.
 */
export function useBasket() {
  const { state, dispatch } = useContext(DownloadsContext);
  const { basket, rows } = state;

  const basketSet = useMemo(() => new Set(basket), [basket]);
  const rowsById = useMemo(() => selectRowsById(rows), [rows]);
  const basketRows = useMemo(() => selectBasketRows(rows, basket), [rows, basket]);

  const nameOf = useCallback((id: string) => rowsById.get(id)?.name ?? id, [rowsById]);

  const inBasket = useCallback((id: string) => basketSet.has(id), [basketSet]);

  const add = useCallback(
    (ids: string[]) => {
      const missing = ids.filter(id => !basketSet.has(id));
      if (!missing.length) return;
      dispatch(addToBasket(missing));
      announce(
        missing.length === 1
          ? `${nameOf(missing[0])} added to basket`
          : `${missing.length} datasets added to basket`
      );
    },
    [basketSet, dispatch, nameOf]
  );

  const remove = useCallback(
    (id: string) => {
      if (!basketSet.has(id)) return;
      dispatch(removeFromBasket(id));
      announce(`${nameOf(id)} removed from basket`);
    },
    [basketSet, dispatch, nameOf]
  );

  const toggle = useCallback(
    (id: string) => (basketSet.has(id) ? remove(id) : add([id])),
    [basketSet, add, remove]
  );

  const clear = useCallback(() => {
    dispatch(clearBasket());
    announce("Basket emptied");
  }, [dispatch]);

  const setOpen = useCallback((open: boolean) => dispatch(setBasketOpen(open)), [dispatch]);

  return {
    basket,
    basketRows,
    count: basket.length,
    open: state.basketOpen,
    inBasket,
    add,
    remove,
    toggle,
    clear,
    setOpen,
    getDatasetId,
  };
}

export default useBasket;
