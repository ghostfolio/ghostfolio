import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ImportDataDto } from './import-data.dto';

const validationPipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

function loadImportData(fileName: string): ImportDataDto {
  const { accounts, activities, assetProfiles, platforms, tags } = JSON.parse(
    readFileSync(
      join(__dirname, '../../../../../test/import/not-ok', fileName),
      'utf8'
    )
  ) as ImportDataDto;

  return { accounts, activities, assetProfiles, platforms, tags };
}

describe('ImportDataDto', () => {
  it.each([
    {
      fileName: 'invalid-data-source.json',
      messages: [
        expect.stringMatching(
          /^activities\.0\.dataSource must be one of the following values: /
        )
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
        expect.stringMatching(
          /^activities\.0\.type must be one of the following values: /
        )
      ]
    }
  ])('refuses $fileName', async ({ fileName, messages }) => {
    const error: unknown = await validationPipe
      .transform(loadImportData(fileName), {
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
