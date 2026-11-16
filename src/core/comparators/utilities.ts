import { Comparator } from "./types";

export const compareUndefinedAsc = (a?: unknown, b?: unknown): number => {
  if (!a) {
    if (!b) return 0;
    return -1;
  }
  if (!b) return 1;
  return 0;
};

export const compareAlphabeticalAsc: Comparator<string> = (
  a, b
) => a.localeCompare(b);
