import { countries } from 'countries-list';

export function getCountryCodeByName({
  aliases = {},
  name
}: {
  aliases?: Record<string, string>;
  name: string;
}): string {
  if (aliases[name]) {
    return aliases[name];
  }

  for (const [code, country] of Object.entries(countries)) {
    if (country.name === name) {
      return code;
    }
  }

  return undefined;
}
