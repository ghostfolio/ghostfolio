import { countries } from 'countries-list';

export function getCountryCodeByName({
  aliases = {},
  name
}: {
  aliases?: Record<string, string>;
  name: string;
}): string {
  for (const [code, country] of Object.entries(countries)) {
    if (country.name === name || country.name === aliases[name]) {
      return code;
    }
  }

  return undefined;
}
