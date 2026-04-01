import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

Object.assign(globalThis, {
  $localize: (messageParts: TemplateStringsArray, ...expressions: string[]) => {
    return messageParts.reduce((result, part, index) => {
      return result + part + (expressions[index] ?? '');
    }, '');
  }
});
