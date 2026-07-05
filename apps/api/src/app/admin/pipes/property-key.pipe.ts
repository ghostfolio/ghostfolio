import * as config from '@ghostfolio/common/config';
import type { PropertyKey } from '@ghostfolio/common/types';

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PropertyKeyPipe implements PipeTransform<string, PropertyKey> {
  private readonly allowedKeys: Set<string>;

  public constructor() {
    this.allowedKeys = new Set<string>(
      Object.entries(config)
        .filter(([key]) => {
          return key.startsWith('PROPERTY_');
        })
        .map(([, value]) => {
          return value as string;
        })
    );
  }

  public transform(value: string): PropertyKey {
    if (!this.allowedKeys.has(value)) {
      throw new BadRequestException(`Invalid property key: ${value}`);
    }

    return value as PropertyKey;
  }
}
