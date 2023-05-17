import { BenchmarkService } from './benchmark.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { PROPERTY_BENCHMARKS } from '@ghostfolio/common/config';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { NotFoundError } from '@ghostfolio/common/exceptions';

jest.mock('@ghostfolio/api/services/property/property.service', () => {
  return {
    PropertyService: jest.fn().mockImplementation(() => {
      return {
        getByKey: jest.fn().mockImplementation((key: string) => {
          return [{ symbolProfileId: 'profile-id-1' }];
        }),
        put: jest.fn().mockImplementation(({ key, value }) => {
          return Promise.resolve();
        })
      };
    })
  };
});

jest.mock('@ghostfolio/api/services/prisma/prisma.service', () => {
  return {
    PrismaService: jest.fn().mockImplementation(() => {
      return {
        symbolProfile: {
          findFirst: jest.fn()
        }
      };
    })
  };
});

describe('BenchmarkService', () => {
  let benchmarkService: BenchmarkService;
  let prismaService: PrismaService = new PrismaService();
  let propertyService: PropertyService = new PropertyService(prismaService);

  beforeAll(async () => {
    benchmarkService = new BenchmarkService(
      null,
      null,
      propertyService,
      null,
      null,
      null,
      prismaService
    );
  });

  it('calculateChangeInPercentage', async () => {
    expect(benchmarkService.calculateChangeInPercentage(1, 2)).toEqual(1);
    expect(benchmarkService.calculateChangeInPercentage(2, 2)).toEqual(0);
    expect(benchmarkService.calculateChangeInPercentage(2, 1)).toEqual(-0.5);
  });

  it('should add new benchmark', async () => {
    prismaService.symbolProfile.findFirst = jest
      .fn()
      .mockResolvedValueOnce(
        Promise.resolve({ id: 'profile-id-2', name: 'Test Profile' })
      );

    const result = await benchmarkService.addBenchmark({
      dataSource: 'YAHOO',
      symbol: 'symbol-2'
    });

    expect(propertyService.put).toHaveBeenCalledWith({
      key: PROPERTY_BENCHMARKS,
      value: JSON.stringify([
        { symbolProfileId: 'profile-id-1' },
        { symbolProfileId: 'profile-id-2' }
      ])
    });
    expect(result).toEqual({
      dataSource: 'YAHOO',
      id: 'profile-id-2',
      name: 'Test Profile',
      symbol: 'symbol-2'
    });
  });

  it('should throw error if symbol profile not found', async () => {
    prismaService.symbolProfile.findFirst = jest
      .fn()
      .mockResolvedValueOnce(Promise.resolve(null));
    try {
      await benchmarkService.addBenchmark({
        dataSource: 'YAHOO',
        symbol: 'symbol-2'
      });
    } catch (e) {
      expect(e).toEqual(new NotFoundError('Symbol profile not found'));
    }
  });
});
