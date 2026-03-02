import { DateRange } from '@ghostfolio/common/types';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

Chart.register(
  CategoryScale,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip
);

interface RangeOption {
  label: string;
  value: DateRange;
}

@Component({
  imports: [CommonModule],
  providers: [DecimalPipe],
  selector: 'gf-agent-chart-panel',
  styleUrls: ['./agent-chart-panel.component.scss'],
  templateUrl: './agent-chart-panel.component.html'
})
export class GfAgentChartPanelComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() range: DateRange = 'max';
  @Output() rangeChange = new EventEmitter<DateRange>();

  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;

  public currentValue = 0;
  public isLoading = false;
  public returnPct = 0;
  public todayChange = 0;

  public ranges: RangeOption[] = [
    { label: '1W', value: 'wtd' },
    { label: '1M', value: 'mtd' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
    { label: 'YTD', value: 'ytd' },
    { label: '1Y', value: '1y' },
    { label: 'ALL', value: 'max' }
  ];

  private chart: Chart | null = null;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    private decimalPipe: DecimalPipe
  ) {}

  public ngAfterViewInit(): void {
    this.loadData();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['range'] && !changes['range'].firstChange) {
      this.loadData();
    }
  }

  public setRange(range: DateRange): void {
    this.range = range;
    this.rangeChange.emit(range);
    this.loadData();
  }

  public ngOnDestroy(): void {
    this.chart?.destroy();
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private loadData(): void {
    this.isLoading = true;

    this.dataService
      .fetchPortfolioPerformance({ range: this.range, withItems: true })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          const perf = response.performance;
          this.currentValue =
            perf?.currentNetWorth ?? perf?.currentValueInBaseCurrency ?? 0;
          this.returnPct = perf?.netPerformancePercentage ?? 0;

          // Approximate today's change from last two chart points
          const chartData = response.chart ?? [];
          if (chartData.length >= 2) {
            const last = chartData[chartData.length - 1]?.netWorth ?? 0;
            const prev = chartData[chartData.length - 2]?.netWorth ?? 0;
            this.todayChange = prev > 0 ? ((last - prev) / prev) * 100 : 0;
          } else {
            this.todayChange = 0;
          }

          this.renderChart(chartData);
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  private renderChart(
    data: {
      date: string;
      netWorth?: number;
      netPerformanceInPercentage?: number;
    }[]
  ): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;

    this.chart?.destroy();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 102, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 102, 0, 0)');

    const labels = data.map((d) => d.date);
    const values = data.map((d) => d.netWorth ?? 0);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: '#ff6600',
            borderWidth: 1.5,
            backgroundColor: gradient,
            fill: true,
            pointRadius: 0,
            pointHitRadius: 8,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a',
            borderColor: '#333',
            borderWidth: 1,
            titleColor: '#999',
            bodyColor: '#ff6600',
            bodyFont: { family: 'monospace', size: 12 },
            titleFont: { family: 'monospace', size: 10 },
            padding: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                return `$${this.decimalPipe.transform(val, '1.2-2') ?? val}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            grid: { display: false },
            ticks: {
              color: '#555',
              font: { family: 'monospace', size: 9 },
              maxTicksLimit: 6
            },
            border: { display: false }
          },
          y: {
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: {
              color: '#555',
              font: { family: 'monospace', size: 9 },
              callback: (value) => {
                const num = Number(value);
                if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
                if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
                return String(num);
              }
            },
            border: { display: false }
          }
        }
      }
    });
  }
}
