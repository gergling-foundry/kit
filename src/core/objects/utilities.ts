export const getObjectKeys = <T extends object>(
  obj: T
) => Object.keys(obj) as (keyof T)[];

export const getObjectEntries = <T extends object>(
  obj: T
) => Object.entries(obj) as [keyof T, T[keyof T]][];

export const getObjectFromEntries = <T extends PropertyKey, U>(
  entries: [T, U][]
) => Object.fromEntries(entries) as Record<T, U>;
