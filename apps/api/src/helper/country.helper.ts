import { Logger } from '@nestjs/common';
import { countries } from 'countries-list';

export function getCountryCodeByName({
  aliases = {},
  dataSource,
  name
}: {
  aliases?: Record<string, string>;
  dataSource?: string;
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

  if (name && name.toLowerCase() !== 'other') {
    const logger = new Logger('getCountryCodeByName');

    logger.warn(
      `Could not map the country "${name}" to a code${
        dataSource ? ` (${dataSource})` : ''
      }`
    );
  }

  return undefined;
}
