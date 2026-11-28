import { ExchangeRateDataService } from './exchange-rate-data.service';

describe('ExchangeRateDataService', () => {
  let service: ExchangeRateDataService;

  beforeEach(() => {
    service = new ExchangeRateDataService(null, null, null, null);
  });

  describe('toCurrency', () => {
    it('should return the value unchanged for a null source currency without logging an error', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const result = service.toCurrency(100, null as any, 'EUR');

      expect(result).toEqual(100);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should return the value unchanged for an undefined source currency without logging an error', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const result = service.toCurrency(100, undefined as any, 'EUR');

      expect(result).toEqual(100);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should return the value unchanged for a null target currency without logging an error', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      const result = service.toCurrency(100, 'EUR', null as any);

      expect(result).toEqual(100);
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('should return 0 for a value of 0', () => {
      expect(service.toCurrency(0, 'USD', 'EUR')).toEqual(0);
    });
  });
});
