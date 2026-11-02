import { DEFAULT_DATE_RANGE } from '@ghostfolio/common/config';

import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { DateRangeFilterDto } from './date-range-filter.dto';

const validationPipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

function validate(query: object) {
  return validationPipe.transform(query, {
    metatype: DateRangeFilterDto,
    type: 'query'
  });
}

describe('DateRangeFilterDto', () => {
  it(`Gives the date range ${DEFAULT_DATE_RANGE} if the range is absent`, async () => {
    await expect(validate({})).resolves.toMatchObject({
      range: DEFAULT_DATE_RANGE
    });
  });

  it.each(['1d', '2024'])('Accepts the date range %s', async (range) => {
    await expect(validate({ range })).resolves.toMatchObject({ range });
  });

  it.each(['2w', '9999'])('Refuses the date range %s', async (range) => {
    await expect(validate({ range })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
