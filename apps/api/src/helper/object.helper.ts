import { Big } from 'big.js';
import { cloneDeep, isArray, isObject } from 'lodash';

import { RedactylNullSupported } from './redactyle.helper';

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

  let redactedObject = isFirstRun ? cloneDeep(object) : object;

  for (const option of options) {
    const { attribute, valueMap } = option;

    const redactyl = new RedactylNullSupported({ properties: [] });
    redactyl.addProperties([attribute]);

    // Handle different value mapping scenarios
    if ('*' in valueMap) {
      // Wildcard replacement - replace all instances of this attribute
      redactyl.setText(valueMap['*']);
      redactedObject = redactyl.redact(redactedObject);
    } else {
      // Specific value mapping - need to handle this differently
      // We'll use a custom approach for specific value mappings
      redactedObject = redactSpecificValues(
        redactedObject,
        attribute,
        valueMap
      );
    }
  }

  return redactedObject;
}

// Helper function to handle specific value mappings (non-wildcard)
function redactSpecificValues(
  obj: any,
  attribute: string,
  valueMap: { [key: string]: any }
): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (isArray(obj)) {
    return obj.map((item) => redactSpecificValues(item, attribute, valueMap));
  }

  const result = { ...obj };

  // Check if current level has the attribute and if its value should be replaced
  if (attribute in result) {
    const currentValue = result[attribute];
    if (currentValue in valueMap) {
      result[attribute] = valueMap[currentValue];
    }
  }

  // Recursively process nested objects
  for (const key in result) {
    if (isObject(result[key]) && !(result[key] instanceof Big)) {
      result[key] = redactSpecificValues(result[key], attribute, valueMap);
    } else if (isArray(result[key])) {
      result[key] = result[key].map((item: any) =>
        isObject(item) ? redactSpecificValues(item, attribute, valueMap) : item
      );
    }
  }

  return result;
}
