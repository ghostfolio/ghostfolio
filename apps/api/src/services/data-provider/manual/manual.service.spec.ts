import { ManualService } from './manual.service';

describe('ManualService', () => {
  let manualService: ManualService;

  beforeEach(() => {
    manualService = new ManualService(null, null, null);
  });

  describe('extractValueFromJson', () => {
    it('should extract market price from stock API response', () => {
      const data = {
        currency: 'USD',
        market: {
          previousClose: 273.04,
          price: 271.86
        },
        symbol: 'AAPL'
      };

      const result = manualService.extractValueFromJson({
        data,
        pathExpression: '$.market.price'
      });

      expect(result).toBe('271.86');
    });
  });
});
