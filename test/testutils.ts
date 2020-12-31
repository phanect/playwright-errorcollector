"use strict";

/**
 * Sort array of the objects by the same order.
 *
 * @param {object[]} objects - Aarray of objects.
 * @returns {object[]} - Sorted array of the objects.
 */
export function sortObjects(objects: Record<string, any>[]): Record<string, any>[] {
  return objects.sort((obj1, obj2) => {
    const keys = Object.keys(obj1).sort();

    for (const key of keys) {
      if (!(key in obj1) || !(key in obj2)) {
        continue;
      } else if (obj1[key] === obj2[key]) {
        continue;
      } else if (obj1[key] < obj2[key]) {
        return -1;
      } else { // if (obj1[key] > obj2[key])
        return 1;
      }
    }
    return 0;
  });
}
