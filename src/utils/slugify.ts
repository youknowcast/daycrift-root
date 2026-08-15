import kebabcase from "lodash.kebabcase";

/**
 * Slugify a string using lodash.kebabcase (e.g. "BaseGuitar" → "base-guitar").
 * This matches the legacy Gatsby tag URL slugs exactly.
 */
export const slugifyStr = (str: string): string => kebabcase(str);

export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
