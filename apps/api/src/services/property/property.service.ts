import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  PROPERTY_CURRENCIES,
  PROPERTY_IS_USER_SIGNUP_ENABLED
} from '@ghostfolio/common/config';

import { Injectable } from '@nestjs/common';

@Injectable()
export class PropertyService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async delete({ key }: { key: string }) {
    return this.prismaService.property.delete({
      where: { key }
    });
  }

  public async get() {
    const response: {
      [key: string]: boolean | object | string | string[];
    } = {
      [PROPERTY_CURRENCIES]: []
    };

    const properties = await this.prismaService.property.findMany();

    for (const property of properties) {
      let value = property.value;

      try {
        value = JSON.parse(property.value);
      } catch {}

      response[property.key] = value;
    }

    return response;
  }

  public async getByKey(aKey: string) {
    const properties = await this.get();
    return properties?.[aKey];
  }

  public async isUserSignupEnabled() {
    return (
      ((await this.getByKey(PROPERTY_IS_USER_SIGNUP_ENABLED)) as boolean) ??
      true
    );
  }

  public async put({ key, value }: { key: string; value: string }) {
    return this.prismaService.property.upsert({
      create: { key, value },
      update: { value },
      where: { key }
    });
  }
}
