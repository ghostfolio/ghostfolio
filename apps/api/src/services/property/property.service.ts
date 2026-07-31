import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  PROPERTY_CURRENCIES,
  PROPERTY_IS_USER_SIGNUP_ENABLED
} from '@ghostfolio/common/config';
import { PropertyKey } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { Property } from '@prisma/client';
import { addMilliseconds, isBefore } from 'date-fns';
import ms from 'ms';

import { PropertyValue } from './interfaces/interfaces';

@Injectable()
export class PropertyService {
  private static readonly CACHE_TTL = ms('1 minute');

  private cachedProperties: Promise<Property[]>;
  private cachedPropertiesExpiresAt: Date;

  public constructor(private readonly prismaService: PrismaService) {}

  public async delete({ key }: { key: PropertyKey }) {
    const property = await this.prismaService.property.delete({
      where: { key }
    });

    this.invalidateCache();

    return property;
  }

  public async get() {
    const response: {
      [key: string]: PropertyValue;
    } = {
      [PROPERTY_CURRENCIES]: []
    };

    const properties = await this.getProperties();

    for (const property of properties) {
      let value = property.value;

      try {
        value = JSON.parse(property.value);
      } catch {}

      response[property.key] = value;
    }

    return response;
  }

  public async getByKey<TValue extends PropertyValue>(aKey: PropertyKey) {
    const properties = await this.get();
    return properties[aKey] as TValue;
  }

  public async isUserSignupEnabled() {
    return (
      (await this.getByKey<boolean>(PROPERTY_IS_USER_SIGNUP_ENABLED)) ?? true
    );
  }

  public async put({ key, value }: { key: PropertyKey; value: string }) {
    const property = await this.prismaService.property.upsert({
      create: { key, value },
      update: { value },
      where: { key }
    });

    this.invalidateCache();

    return property;
  }

  /**
   * Returns the properties from the in-memory cache, falling back to the
   * database
   */
  private async getProperties() {
    if (
      this.cachedProperties &&
      isBefore(new Date(), this.cachedPropertiesExpiresAt)
    ) {
      return this.cachedProperties;
    }

    this.cachedProperties = this.prismaService.property
      .findMany()
      .catch((error) => {
        this.invalidateCache();

        throw error;
      });

    this.cachedPropertiesExpiresAt = addMilliseconds(
      new Date(),
      PropertyService.CACHE_TTL
    );

    return this.cachedProperties;
  }

  private invalidateCache() {
    this.cachedProperties = undefined;
    this.cachedPropertiesExpiresAt = undefined;
  }
}
