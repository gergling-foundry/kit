/**
 * Preserves the key type of the object.
 * @param obj 
 * @returns The keys but with the type preserved.
 */
export const getObjectKeys = <T extends object>(
  obj: T
) => Object.keys(obj) as (keyof T)[];

/**
 * Preserves the type given by Object.entries.
 * @param obj 
 * @returns The entries but with the types preserved.
 */
export const getObjectEntries = <T extends object>(
  obj: T
) => Object.entries(obj) as [keyof T, T[keyof T]][];

export const getObjectFromEntries = <T extends PropertyKey, U>(
  entries: [T, U][]
) => Object.fromEntries(entries) as Record<T, U>;
