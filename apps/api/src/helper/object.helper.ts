import { Big } from 'big.js';
import { isArray, isObject } from 'lodash';

export function redactAttributes({
  isFirstRun = true,
  object,
  options
}: {
  isFirstRun?: boolean;
  object: any;
  options: { attribute: string; valueMap: { [key: string]: any } }[];
}): any {
  if (!object || !options || !options.length) {
    return object;
  }

  const redactedObject = isFirstRun ? { ...object } : object;

  for (const option of options) {
    const { attribute, valueMap } = option;

    // Directly check and redact attributes
    // Directly check and redact attributes
    if (redactedObject.hasOwnProperty(attribute)) {
      const value = redactedObject[attribute];
      // Apply specific value or wildcard ('*')
      if (valueMap.hasOwnProperty(value)) {
        redactedObject[attribute] = valueMap[value];
      } else if (valueMap.hasOwnProperty('*')) {
        redactedObject[attribute] = valueMap['*'];
      }
    } else {
      // Iterate over nested objects or arrays
      for (const key in redactedObject) {
        const prop = redactedObject[key];
        if (isArray(prop)) {
          redactedObject[key] = prop.map((item) =>
            redactAttributes({
              object: item,
              options,
              isFirstRun: false
            })
          );
        } else if (isObject(prop) && !(prop instanceof Big)) {
          redactedObject[key] = redactAttributes({
            object: prop,
            options,
            isFirstRun: false
          });
        }
      }
    }
  }

  return redactedObject;
}
