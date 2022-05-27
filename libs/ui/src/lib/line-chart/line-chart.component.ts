import 'chartjs-adapter-date-fns';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  getBackgroundColor,
  getDateFormatString,
  getTextColor
} from '@ghostfolio/common/helper';
import {
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip
} from 'chart.js';

import { LineChartItem } from './interfaces/line-chart.interface';

@Component({
  selector: 'gf-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() benchmarkDataItems: LineChartItem[] = [];
  @Input() benchmarkLabel = '';
  @Input() historicalDataItems: LineChartItem[];
  @Input() locale: string;
  @Input() showGradient = false;
  @Input() showLegend = false;
  @Input() showLoader = true;
  @Input() showXAxis = false;
  @Input() showYAxis = false;
  @Input() symbol: string;
  @Input() yMax: number;
  @Input() yMaxLabel: string;
  @Input() yMin: number;
  @Input() yMinLabel: string;

  @ViewChild('chartCanvas') chartCanvas;

  public chart: Chart;
  public isLoading = true;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {
    Chart.register(
      Filler,
      LineController,
      LineElement,
      PointElement,
      LinearScale,
      TimeScale,
      Tooltip
    );

    Tooltip.positioners['top'] = (elements, position) => {
      if (position === false) {
        return false;
      }
      return {
        x: position.x,
        y: this.chart.chartArea.top
      };
    };
  }

  public ngAfterViewInit() {
    if (this.historicalDataItems) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.initialize();

        this.changeDetectorRef.markForCheck();
      });
    }
  }

  public ngOnChanges() {
    if (this.historicalDataItems) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.initialize();

        this.changeDetectorRef.markForCheck();
      });
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

    const gradient = this.chartCanvas?.nativeElement
      ?.getContext('2d')
      .createLinearGradient(
        0,
        0,
        0,
        (this.chartCanvas.nativeElement.parentNode.offsetHeight * 4) / 5
      );

    if (gradient && this.showGradient) {
      gradient.addColorStop(
        0,
        `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b}, 0.01)`
      );
      gradient.addColorStop(1, getBackgroundColor());
    }

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
            elements: {
              point: {
                hoverBackgroundColor: getBackgroundColor(),
                hoverRadius: 2
              }
            },
            interaction: { intersect: false, mode: 'index' },
            plugins: <any>{
              legend: {
                align: 'start',
                display: this.showLegend,
                position: 'bottom'
              },
              tooltip: {
                itemSort: (a, b) => {
                  // Reverse order
                  return b.datasetIndex - a.datasetIndex;
                },
                mode: 'index',
                position: <any>'top',
                xAlign: 'center',
                yAlign: 'bottom'
              },
              verticalHoverLine: {
                color: `rgba(${getTextColor()}, 0.1)`
              }
            },
            scales: {
              x: {
                display: this.showXAxis,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.2)`,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false
                },
                time: {
                  tooltipFormat: getDateFormatString(this.locale),
                  unit: 'year'
                },
                type: 'time'
              },
              y: {
                display: this.showYAxis,
                grid: {
                  borderColor: `rgba(${getTextColor()}, 0.2)`,
                  color: `rgba(${getTextColor()}, 0.8)`,
                  display: false
                },
                max: this.yMax,
                min: this.yMin,
                ticks: {
                  display: this.showYAxis,
                  callback: (tickValue, index, ticks) => {
                    if (index === 0 || index === ticks.length - 1) {
                      // Only print last and first legend entry

                      if (index === 0 && this.yMinLabel) {
                        return this.yMinLabel;
                      }

                      if (index === ticks.length - 1 && this.yMaxLabel) {
                        return this.yMaxLabel;
                      }

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
          plugins: [
            {
              afterDatasetsDraw: (chart, x, options) => {
                const active = chart.getActiveElements();

                if (!active || active.length === 0) {
                  return;
                }

                const color = options.color || `rgb(${getTextColor()})`;
                const width = options.width || 1;

                const {
                  chartArea: { bottom, top }
                } = chart;
                const xValue = active[0].element.x;

                const context = this.chartCanvas.nativeElement.getContext('2d');
                context.lineWidth = width;
                context.strokeStyle = color;

                context.beginPath();
                context.moveTo(xValue, top);
                context.lineTo(xValue, bottom);
                context.stroke();
              },
              id: 'verticalHoverLine'
            }
          ],
          type: 'line'
        });
      }
    }

    this.isLoading = false;
  }
}
