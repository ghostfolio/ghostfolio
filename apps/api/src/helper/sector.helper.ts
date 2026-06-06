import { SECTORS, UNKNOWN_KEY } from '@ghostfolio/common/config';

import { Logger } from '@nestjs/common';

export function getSectorName({
  aliases = {},
  name
}: {
  aliases?: Record<string, string>;
  name: string;
}): string {
  const mappedName = aliases[name];

  if (mappedName) {
    return mappedName;
  }

  if ((SECTORS as readonly string[]).includes(name)) {
    return name;
  }

  if (name) {
    const logger = new Logger('getSectorName');

    logger.warn(`Could not map the sector "${name}" to the ontology`);
  }

  return UNKNOWN_KEY;
}
