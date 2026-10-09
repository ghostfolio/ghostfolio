import { DataSource, Type } from '@ghostfolio/prisma/enums';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImportDataDto } from './import-data.dto';

const validationPipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

function loadImportData(directory: string, fileName: string): ImportDataDto {
  const { accounts, activities, assetProfiles, platforms, tags } = JSON.parse(
    readFileSync(
      join(__dirname, '../../../../../test/import', directory, fileName),
      'utf8'
    )
  ) as ImportDataDto;

  return { accounts, activities, assetProfiles, platforms, tags };
}

describe('ImportDataDto', () => {
  it('accepts sample.json', async () => {
    await expect(
      validationPipe.transform(loadImportData('ok', 'sample.json'), {
        metatype: ImportDataDto,
        type: 'body'
      })
    ).resolves.toBeInstanceOf(ImportDataDto);
  });

  it.each([
    {
      fileName: 'invalid-data-source.json',
      messages: [
        `activities.0.dataSource must be one of the following values: ${Object.values(DataSource).join(', ')}`
      ]
    },
    {
      fileName: 'invalid-date-before-min.json',
      messages: ['activities.0.date must be after 1970']
    },
    {
      fileName: 'invalid-date.json',
      messages: [
        'activities.0.date must be after 1970',
        'activities.0.date must be a valid ISO 8601 date string'
      ]
    },
    {
      fileName: 'invalid-type.json',
      messages: [
        `activities.0.type must be one of the following values: ${Object.values(Type).join(', ')}`
      ]
    }
  ])('refuses $fileName', async ({ fileName, messages }) => {
    const error: unknown = await validationPipe
      .transform(loadImportData('not-ok', fileName), {
        metatype: ImportDataDto,
        type: 'body'
      })
      .catch((validationError: unknown) => validationError);

    expect(error).toBeInstanceOf(BadRequestException);

    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: messages
    });
  });
});
