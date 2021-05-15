import 'chartjs-adapter-date-fns';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  getBackgroundColor,
  primaryColorRgb,
  secondaryColorRgb
} from '@ghostfolio/helper';
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale
} from 'chart.js';

import { LineChartItem } from './interfaces/line-chart.interface';

@Component({
  selector: 'gf-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnChanges, OnDestroy, OnInit {
  @Input() benchmarkDataItems: LineChartItem[] = [];
  @Input() benchmarkLabel = '';
  @Input() historicalDataItems: LineChartItem[];
  @Input() showLegend: boolean;
  @Input() showLoader = true;
  @Input() showXAxis: boolean;
  @Input() showYAxis: boolean;
  @Input() symbol: string;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart;
  public isLoading = true;

  public constructor() {
    Chart.register(
      Filler,
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      TimeScale
    );
  }

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.historicalDataItems) {
      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private initialize() {
    this.isLoading = true;
    const benchmarkPrices = [];
    const labels = [];
    const marketPrices = [];

    this.historicalDataItems?.forEach((historicalDataItem, index) => {
      benchmarkPrices.push(this.benchmarkDataItems?.[index]?.value);
      labels.push(historicalDataItem.date);
      marketPrices.push(historicalDataItem.value);
    });

    const canvas = document.getElementById('chartCanvas');

    const gradient = this.chartCanvas?.nativeElement
      ?.getContext('2d')
      .createLinearGradient(
        0,
        0,
        0,
        (this.chartCanvas.nativeElement.parentNode.offsetHeight * 4) / 5
      );
    gradient.addColorStop(
      0,
      `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.01)`
    );
    gradient.addColorStop(1, getBackgroundColor());

    const data = {
      labels,
      datasets: [
        {
          borderColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
          borderWidth: 1,
          data: benchmarkPrices,
          fill: false,
          label: this.benchmarkLabel,
          pointRadius: 0
        },
        {
          backgroundColor: gradient,
          borderColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
          borderWidth: 2,
          data: marketPrices,
          fill: true,
          label: this.symbol,
          pointRadius: 0
        }
      ]
    };

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data = data;
        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data,
          options: {
            animation: false,
            plugins: {
              legend: {
                align: 'start',
                display: this.showLegend,
                position: 'bottom'
              }
            },
            scales: {
              x: {
                display: this.showXAxis,
                grid: {
                  display: false
                },
                time: {
                  unit: 'year'
                },
                type: 'time'
              },
              y: {
                display: this.showYAxis,
                grid: {
                  display: false
                },
                ticks: {
                  display: this.showYAxis,
                  callback: function (tickValue, index, ticks) {
                    if (index === 0 || index === ticks.length - 1) {
                      // Only print last and first legend entry
                      if (typeof tickValue === 'number') {
                        return tickValue.toFixed(2);
                      }

                      return tickValue;
                    }

                    return '';
                  },
                  mirror: true,
                  z: 1
                },
                type: 'linear'
              }
            },
            spanGaps: true
          },
          type: 'line'
        });
      }
    }

    this.isLoading = false;
  }
}
