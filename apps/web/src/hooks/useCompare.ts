import { useState, useEffect } from "react";

const STORAGE_KEY = "ts_compare_lands";
const MAX_COMPARE = 3;

export function useCompare() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCompareIds(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error reading compare list from localStorage", err);
    }
  }, []);

  const addLand = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id].slice(-MAX_COMPARE); // keep only up to MAX_COMPARE items
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeLand = (id: string) => {
    setCompareIds((prev) => {
      const next = prev.filter((item) => item !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clear = () => {
    setCompareIds([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isComparing = (id: string) => compareIds.includes(id);

  return {
    compareIds,
    addLand,
    removeLand,
    clear,
    isComparing,
    isFull: compareIds.length >= MAX_COMPARE,
  };
}
