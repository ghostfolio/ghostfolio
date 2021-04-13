import { cloneDeep, isObject } from 'lodash';

export function hasNotDefinedValuesInObject(aObject: Object): boolean {
  for (const key in aObject) {
    if (aObject[key] === null || aObject[key] === null) {
      return true;
    } else if (isObject(aObject[key])) {
      return hasNotDefinedValuesInObject(aObject[key]);
    }
  }

  return false;
}

export function nullifyValuesInObject<T>(aObject: T, keys: string[]): T {
  const object = cloneDeep(aObject);

  keys.forEach((key) => {
    object[key] = null;
  });

  return object;
}

export function nullifyValuesInObjects<T>(aObjects: T[], keys: string[]): T[] {
  return aObjects.map((object) => {
    return nullifyValuesInObject(object, keys);
  });
}
