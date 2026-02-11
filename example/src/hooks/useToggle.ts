import { useState, useCallback } from "react";

/**
 * Hook for managing boolean toggle state
 * Use this for any on/off, show/hide, or open/close scenarios
 *
 * @param initialValue - Initial boolean state
 * @returns Tuple of [current state, toggle function]
 */
export const useToggle = (
  initialValue: boolean = false,
): [boolean, () => void] => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  return [value, toggle];
};
