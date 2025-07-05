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

  // Use efficient deep clone from lodash only on first run
  const redactedObject = isFirstRun ? cloneDeep(object) : object;

  // Create a Map for faster attribute lookup
  const attributeMap = new Map(
    options.map((opt) => [opt.attribute, opt.valueMap])
  );

  // Process current level attributes first
  for (const [attribute, valueMap] of attributeMap) {
    if (attribute in redactedObject) {
      const currentValue = redactedObject[attribute];

      // Check for wildcard first, then specific value
      if ('*' in valueMap) {
        redactedObject[attribute] = valueMap['*'];
      } else if (currentValue in valueMap) {
        redactedObject[attribute] = valueMap[currentValue];
      }
    }
  }

  // Process nested objects and arrays efficiently
  const propertyNames = Object.keys(redactedObject);
  for (const property of propertyNames) {
    const redactedField = redactedObject[property];

    if (isArray(redactedField)) {
      // Process arrays in-place to avoid creating new arrays
      for (let innerField of redactedField) {
        if (isObject(innerField)) {
          innerField = redactAttributes({
            options,
            isFirstRun: false,
            object: innerField
          });
        }
      }
    } else if (isObject(redactedField) && !(redactedField instanceof Big)) {
      // Recursively process nested objects
      redactedObject[property] = redactAttributes({
        options,
        isFirstRun: false,
        object: redactedField
      });
    }
  }

  return redactedObject;
}
