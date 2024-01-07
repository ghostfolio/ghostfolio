import { extractNumberFromString } from '@ghostfolio/common/helper';

describe('Helper', () => {
  describe('Extract number from string', () => {
    it('Get decimal number', async () => {
      expect(extractNumberFromString('999.99')).toEqual(999.99);
    });

    it('Get decimal number with group', async () => {
      expect(extractNumberFromString('99.999,99')).toEqual(99999.99);
    });
  });
});
