import fastRedact from 'fast-redact';
import jsonpath from 'jsonpath';
import { cloneDeep, isObject } from 'lodash';

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

export function query({
  object,
  pathExpression
}: {
  object: object;
  pathExpression: string;
}) {
  return jsonpath.query(object, pathExpression);
}

export function redactPaths({
  object,
  paths,
  valueMap
}: {
  object: any;
  paths: fastRedact.RedactOptions['paths'];
  valueMap?: { [key: string]: any };
}): any {
  const redact = fastRedact({
    paths,
    censor: (value) => {
      if (valueMap) {
        if (valueMap[value]) {
          return valueMap[value];
        } else {
          return value;
        }
      } else {
        return null;
      }
    }
  });

  return JSON.parse(redact(object));
}
