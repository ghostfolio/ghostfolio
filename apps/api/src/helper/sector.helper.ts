import { SECTORS } from '@ghostfolio/common/config';
import { SectorName } from '@ghostfolio/common/types';

import { Logger } from '@nestjs/common';

export function getSectorName({
  aliases = {},
  name
}: {
  aliases?: Record<string, SectorName>;
  name: string;
}): SectorName {
  if (aliases[name]) {
    return aliases[name];
  }

  if ((SECTORS as readonly string[]).includes(name)) {
    return name as SectorName;
  }

  if (name) {
    const logger = new Logger('getSectorName');

    logger.warn(`Could not map the sector "${name}" to the ontology`);
  }

  return 'Other';
}
