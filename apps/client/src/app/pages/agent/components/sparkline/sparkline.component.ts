import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement
} from 'chart.js';

Chart.register(LinearScale, LineController, LineElement, PointElement);

@Component({
  selector: 'gf-sparkline',
  template: '<canvas #canvas class="sparkline-canvas"></canvas>',
  styles: [
    `
      :host {
        display: inline-block;
        height: 24px;
        vertical-align: middle;
        width: 80px;
      }
      .sparkline-canvas {
        height: 100% !important;
        width: 100% !important;
      }
    `
  ]
})
export class GfSparklineComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() data: number[] = [];
  @Input() color = '#ff6600';

  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  public ngAfterViewInit(): void {
    this.renderChart();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['data'] || changes['color']) &&
      !changes['data']?.firstChange
    ) {
      this.renderChart();
    }
  }

  public ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    const el = this.canvas?.nativeElement;
    if (!el || !this.data.length) return;

    this.chart?.destroy();

    const ctx = el.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.map((_, i) => i),
        datasets: [
          {
            data: this.data,
            borderColor: this.color,
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.3,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  }
}
