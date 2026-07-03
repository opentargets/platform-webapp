import { useEffect, useRef, useState } from "react";

/**
 * Hook to debounce a value after a specified delay
 * Useful for expensive operations triggered by user input
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * const [inputValue, setInputValue] = useState('');
 * const debouncedValue = useDebounce(inputValue, 500);
 *
 * useEffect(() => {
 *   // This runs 500ms after user stops typing
 *   performExpensiveSearch(debouncedValue);
 * }, [debouncedValue]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup on unmount or before new timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}
