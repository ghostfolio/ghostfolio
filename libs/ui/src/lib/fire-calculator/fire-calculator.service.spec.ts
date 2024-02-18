import { Test, TestingModule } from '@nestjs/testing';

import { FireCalculatorService } from './fire-calculator.service';

describe('FireCalculatorService', () => {
  let fireCalculatorService: FireCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FireCalculatorService]
    }).compile();

    fireCalculatorService = module.get<FireCalculatorService>(
      FireCalculatorService
    );
  });

  describe('Test periods to retire', () => {
    it('should return the correct amount of periods to retire with no interst rate', async () => {
      const r = 0;
      const P = 1000;
      const totalAmount = 1900;
      const PMT = 100;

      const periodsToRetire = fireCalculatorService.calculatePeriodsToRetire({
        P,
        r,
        PMT,
        totalAmount
      });

      expect(periodsToRetire).toBe(9);
    });

    it('should return the 0 when total amount is 0', async () => {
      const r = 0.05;
      const P = 100000;
      const totalAmount = 0;
      const PMT = 10000;

      const periodsToRetire = fireCalculatorService.calculatePeriodsToRetire({
        P,
        r,
        PMT,
        totalAmount
      });

      expect(periodsToRetire).toBe(0);
    });

    it('should return the correct amount of periods to retire with interst rate', async () => {
      const r = 0.05;
      const P = 598478.96;
      const totalAmount = 812399.66;
      const PMT = 6000;
      const expectedPeriods = 24;

      const periodsToRetire = fireCalculatorService.calculatePeriodsToRetire({
        P,
        r,
        PMT,
        totalAmount
      });

      expect(Math.round(periodsToRetire)).toBe(expectedPeriods);
    });
  });
});
