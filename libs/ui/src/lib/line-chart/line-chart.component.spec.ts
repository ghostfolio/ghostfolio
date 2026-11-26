import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GfLineChartComponent } from './line-chart.component';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  createLinearGradient: jest.fn().mockReturnValue({
    addColorStop: jest.fn()
  })
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe('GfLineChartComponent', () => {
  let component: GfLineChartComponent;
  let fixture: ComponentFixture<GfLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GfLineChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GfLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('benchmarkDataItems alignment by date', () => {
    it('should align benchmark values by date when date ranges differ', () => {
      component.historicalDataItems = [
        { date: '2025-01-01', value: 50 },
        { date: '2025-06-01', value: 60 },
        { date: '2026-01-01', value: 70 },
        { date: '2026-06-01', value: 80 }
      ];

      component.benchmarkDataItems = [
        { date: '2026-01-01', value: 65 },
        { date: '2026-06-01', value: 75 }
      ];

      (component as unknown as { initialize: () => void }).initialize();

      expect(component.chart).toBeDefined();
      const benchmarkDataset = component.chart?.data.datasets[0];
      expect(benchmarkDataset?.data).toEqual([null, null, 65, 75]);

      const marketDataset = component.chart?.data.datasets[1];
      expect(marketDataset?.data).toEqual([50, 60, 70, 80]);
    });

    it('should align correctly with ISO date strings', () => {
      component.historicalDataItems = [
        { date: '2026-01-01T00:00:00.000Z', value: 100 },
        { date: '2026-01-02T00:00:00.000Z', value: 110 }
      ];

      component.benchmarkDataItems = [
        { date: '2026-01-01', value: 95 },
        { date: '2026-01-02T00:00:00.000Z', value: 105 }
      ];

      (component as unknown as { initialize: () => void }).initialize();

      expect(component.chart).toBeDefined();
      const benchmarkDataset = component.chart?.data.datasets[0];
      expect(benchmarkDataset?.data).toEqual([95, 105]);
    });

    it('should fallback to index-based alignment when benchmark items have no dates', () => {
      component.historicalDataItems = [
        { date: '2026-01-01', value: 100 },
        { date: '2026-01-02', value: 110 }
      ];

      component.benchmarkDataItems = [
        { date: '', value: 90 },
        { date: '', value: 95 }
      ];

      (component as unknown as { initialize: () => void }).initialize();

      expect(component.chart).toBeDefined();
      const benchmarkDataset = component.chart?.data.datasets[0];
      expect(benchmarkDataset?.data).toEqual([90, 95]);
    });
  });
});
