import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { ActivitiesFilterDto } from './activities-filter.dto';

const validationPipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

function validate(query: object) {
  return validationPipe.transform(query, {
    metatype: ActivitiesFilterDto,
    type: 'query'
  });
}

describe('ActivitiesFilterDto', () => {
  it('Accepts an absent date range', async () => {
    await expect(validate({})).resolves.toBeInstanceOf(ActivitiesFilterDto);
  });

  it('Accepts a calendar year', async () => {
    await expect(validate({ range: '2024' })).resolves.toMatchObject({
      range: '2024'
    });
  });

  it('Refuses a calendar year in the future', async () => {
    await expect(validate({ range: '9999' })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
