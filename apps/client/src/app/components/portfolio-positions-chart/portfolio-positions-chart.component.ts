// import 'chartjs-chart-timeline';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  ViewChild
} from '@angular/core';
import { PortfolioItem } from 'apps/api/src/app/portfolio/interfaces/portfolio-item.interface';
import { Chart } from 'chart.js';
import { endOfDay, parseISO, startOfDay } from 'date-fns';
import { primaryColorRgb } from 'libs/helper/src';

@Component({
  selector: 'gf-portfolio-positions-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-positions-chart.component.html',
  styleUrls: ['./portfolio-positions-chart.component.scss']
})
export class PortfolioPositionsChartComponent implements OnChanges, OnInit {
  @Input() portfolioItems: PortfolioItem[];

  // @ViewChild('timelineCanvas') timeline;

  public isLoading = true;

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.portfolioItems) {
      this.initialize();
    }
  }

  private initialize() {
    this.isLoading = true;

    let datasets = [];
    const fromToPosition = {};

    this.portfolioItems.forEach((positionsByDay) => {
      Object.keys(positionsByDay.positions).forEach((symbol) => {
        if (fromToPosition[symbol]) {
          fromToPosition[symbol].push({
            date: positionsByDay.date,
            quantity: positionsByDay.positions[symbol].quantity
          });
        } else {
          fromToPosition[symbol] = [
            {
              date: positionsByDay.date,
              quantity: positionsByDay.positions[symbol].quantity
            }
          ];
        }
      });
    });

    Object.keys(fromToPosition).forEach((symbol) => {
      let currentDate = null;
      let currentQuantity = null;
      let data = [];
      let hasStock = false;

      fromToPosition[symbol].forEach((x, index) => {
        if (x.quantity > 0 && index === 0) {
          currentDate = x.date;
          hasStock = true;
        }

        if (x.quantity === 0 || index === fromToPosition[symbol].length - 1) {
          if (hasStock) {
            data.push([
              startOfDay(parseISO(currentDate)),
              endOfDay(parseISO(x.date)),
              currentQuantity
            ]);
            hasStock = false;
          } else {
            // Do nothing
          }
        } else {
          if (hasStock) {
            // Do nothing
          } else {
            currentDate = x.date;
            hasStock = true;
          }
        }

        currentQuantity = x.quantity;
      });

      if (data.length === 0) {
        // Fill data for today
        data.push([
          startOfDay(new Date()),
          endOfDay(new Date()),
          currentQuantity
        ]);
      }

      datasets.push({ data, symbol });
    });

    // Sort by date
    datasets = datasets.sort((a: any, b: any) => {
      return a.data[0][0].getTime() - b.data[0][0].getTime();
    });

    /*new Chart(this.timeline.nativeElement, {
      type: 'timeline',
      options: {
        elements: {
          colorFunction: (text, data, dataset, index) => {
            return `rgba(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`;
          },
          showText: false,
          textPadding: 4
        },
        maintainAspectRatio: true,
        responsive: true,
        scales: {
          xAxes: [
            {
              gridLines: {
                display: false
              },
              position: 'top',
              time: {
                unit: 'year'
              }
            }
          ],
          yAxes: [
            {
              gridLines: {
                display: false
              },
              ticks: {
                display: false
              }
            }
          ]
        }
      },
      data: {
        datasets,
        labels: datasets.map((dataset) => {
          return dataset.symbol;
        })
      }
    });*/

    this.isLoading = false;
  }
}
