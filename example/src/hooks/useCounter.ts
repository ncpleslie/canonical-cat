import { useState, useCallback } from "react";

/**
 * Return type for the useCounter hook
 */
export interface UseCounterReturn {
  /** Current count value */
  count: number;
  /** Increment the count by 1 */
  increment: () => void;
  /** Decrement the count by 1 */
  decrement: () => void;
  /** Reset the count to initial value */
  reset: () => void;
  /** Set the count to a specific value */
  setCount: (value: number) => void;
}

/**
 * Hook for managing a numeric counter with increment, decrement, and reset functionality
 * Use this for any counting logic like pagination, quantity selectors, or score tracking
 */
export const useCounter = (initialValue: number = 0): UseCounterReturn => {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return {
    count,
    increment,
    decrement,
    reset,
    setCount,
  };
};
