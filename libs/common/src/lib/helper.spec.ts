import {
  eachDayOfInterval,
  extractNumberFromString
} from '@ghostfolio/common/helper';

describe('Helper', () => {
  describe('Extract number from string', () => {
    it('Get decimal number', async () => {
      expect(extractNumberFromString({ value: '999.99' })).toEqual(999.99);
    });

    it('Get decimal number (with spaces)', async () => {
      expect(extractNumberFromString({ value: ' 999.99 ' })).toEqual(999.99);
    });

    it('Get decimal number (with currency)', async () => {
      expect(extractNumberFromString({ value: '999.99 CHF' })).toEqual(999.99);
    });

    it('Get decimal number (comma notation)', async () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number with group (dot notation)', async () => {
      expect(
        extractNumberFromString({ locale: 'de-CH', value: '99’999.99' })
      ).toEqual(99999.99);
    });

    it('Get decimal number with group (comma notation)', async () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '99.999,99' })
      ).toEqual(99999.99);
    });

    it('Not a number', async () => {
      expect(extractNumberFromString({ value: 'X' })).toEqual(NaN);
    });
  });
  describe('eachDayOfInterval', () => {
    describe('start and end', () => {
      const expected = [
        new Date(Date.UTC(2021, 0, 1)),
        new Date(Date.UTC(2021, 0, 2)),
        new Date(Date.UTC(2021, 0, 3))
      ];
      it('as strings', () => {
        const [start, end] = ['2021-01-01', '2021-01-03'];
        expect(eachDayOfInterval({ start, end })).toEqual(expected);
      });
      it('as numbers', () => {
        const [start, end] = [Date.UTC(2021, 0, 1), Date.UTC(2021, 0, 3)];
        expect(eachDayOfInterval({ start, end })).toEqual(expected);
      });
      it('as dates', () => {
        const [start, end] = [
          new Date(Date.UTC(2021, 0, 1)),
          new Date(Date.UTC(2021, 0, 3))
        ];
        expect(eachDayOfInterval({ start, end })).toEqual(expected);
      });
    });
    describe('step', () => {
      const [start, end] = ['2021-01-01', '2021-01-06'];
      it('step size of 2', () => {
        const expected = [
          new Date(Date.UTC(2021, 0, 1)),
          new Date(Date.UTC(2021, 0, 3)),
          new Date(Date.UTC(2021, 0, 5))
        ];
        expect(eachDayOfInterval({ start, end, step: 2 })).toEqual(expected);
      });
      it('step size of 4', () => {
        const expected = [
          new Date(Date.UTC(2021, 0, 1)),
          new Date(Date.UTC(2021, 0, 5))
        ];
        expect(eachDayOfInterval({ start, end, step: 4 })).toEqual(expected);
      });
      it('step size of 5', () => {
        const expected = [
          new Date(Date.UTC(2021, 0, 1)),
          new Date(Date.UTC(2021, 0, 6))
        ];
        expect(eachDayOfInterval({ start, end, step: 5 })).toEqual(expected);
      });
    });
    describe('includeEnd', () => {
      const [start, end] = ['2021-01-01', '2021-01-06'];
      it('end is added', () => {
        const expected = [
          new Date(Date.UTC(2021, 0, 1)),
          new Date(Date.UTC(2021, 0, 5)),
          new Date(Date.UTC(2021, 0, 6))
        ];
        expect(
          eachDayOfInterval({ start, end, step: 4, includeEnd: true })
        ).toEqual(expected);
      });
      it('end is not duplicated', () => {
        const expected = [
          new Date(Date.UTC(2021, 0, 1)),
          new Date(Date.UTC(2021, 0, 6))
        ];
        expect(
          eachDayOfInterval({ start, end, step: 5, includeEnd: true })
        ).toEqual(expected);
      });
    });
  });
});
