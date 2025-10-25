import { Big } from 'big.js';
import { cloneDeep, isArray, isObject } from 'lodash';

export function hasNotDefinedValuesInObject(aObject: Object): boolean {
  for (const key in aObject) {
    if (aObject[key] === null || aObject[key] === undefined) {
      return true;
    } else if (isObject(aObject[key])) {
      return hasNotDefinedValuesInObject(aObject[key]);
    }
  }

  return false;
}

export function nullifyValuesInObject<T>(aObject: T, keys: string[]): T {
  const object = cloneDeep(aObject);

  if (object) {
    keys.forEach((key) => {
      object[key] = null;
    });
  }

  return object;
}

export function nullifyValuesInObjects<T>(aObjects: T[], keys: string[]): T[] {
  return aObjects.map((object) => {
    return nullifyValuesInObject(object, keys);
  });
}

// Helper: Custom fast clone (faster than structuredClone for our use case)
function fastClone(obj: any, seen = new WeakMap()): any {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Don't clone Big.js instances
  if (obj instanceof Big) {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  // Handle arrays
  if (isArray(obj)) {
    const arr: any[] = [];
    seen.set(obj, arr);
    for (let i = 0; i < obj.length; i++) {
      arr[i] = fastClone(obj[i], seen);
    }
    return arr;
  }

  // Handle objects
  const cloned: any = {};
  seen.set(obj, cloned);
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    cloned[key] = fastClone(obj[key], seen);
  }
  return cloned;
}

export function redactAttributes({
  isFirstRun = true,
  object,
  options
}: {
  isFirstRun?: boolean;
  object: any;
  options: { attribute: string; valueMap: { [key: string]: any } }[];
}): any {
  if (!object || !options?.length) {
    return object;
  }

  // Optimization 1: Use custom fast clone instead of structuredClone
  const redactedObject = isFirstRun ? fastClone(object) : object;

  // Optimization 2: Pre-process options and separate wildcards from conditional mappings
  const wildcardAttrs = new Map<string, any>();
  const conditionalAttrs = new Map<string, { [key: string]: any }>();

  for (const opt of options) {
    if ('*' in opt.valueMap) {
      wildcardAttrs.set(opt.attribute, opt.valueMap['*']);
    } else {
      conditionalAttrs.set(opt.attribute, opt.valueMap);
    }
  }

  // Optimization 3: Use iterative traversal with pointer-based queue
  const workQueue: any[] = [redactedObject];
  let queueIndex = 0;

  while (queueIndex < workQueue.length) {
    const current = workQueue[queueIndex++];

    // Skip null/undefined
    if (current == null) {
      continue;
    }

    // Process wildcard attributes first (most common case)
    for (const [attribute, replacementValue] of wildcardAttrs) {
      if (attribute in current) {
        current[attribute] = replacementValue;
      }
    }

    // Process conditional attributes
    for (const [attribute, valueMap] of conditionalAttrs) {
      if (attribute in current) {
        const currentValue = current[attribute];
        if (currentValue in valueMap) {
          current[attribute] = valueMap[currentValue];
        }
      }
    }

    // Optimization 4: Use Object.keys() instead of for...in (faster, no inherited props)
    const keys = Object.keys(current);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = current[key];

      // Optimization 5: Cache type check
      const valueType = typeof value;
      if (valueType !== 'object' || value === null) {
        continue;
      }

      if (isArray(value)) {
        // Optimization 6: Batch array processing
        if (value.length > 0) {
          for (let j = 0; j < value.length; j++) {
            const item = value[j];
            if (item != null && typeof item === 'object') {
              workQueue.push(item);
            }
          }
        }
      } else if (!(value instanceof Big)) {
        // Push object to queue (Big.js instances excluded)
        workQueue.push(value);
      }
    }
  }

  return redactedObject;
}
