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
import { FormBuilder, FormControl } from '@angular/forms';
import { primaryColorRgb, secondaryColorRgb } from '@ghostfolio/common/config';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip
} from 'chart.js';

import { FireCalculatorService } from './fire-calculator.service';
import { Subject, takeUntil } from 'rxjs';
import { transformTickToAbbreviation } from '@ghostfolio/common/helper';

@Component({
  selector: 'gf-fire-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fire-calculator.component.html',
  styleUrls: ['./fire-calculator.component.scss']
})
export class FireCalculatorComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() currency: string;
  @Input() deviceType: string;
  @Input() fireWealth: number;
  @Input() locale: string;

  @ViewChild('chartCanvas') chartCanvas;

  public calculatorForm = this.formBuilder.group({
    annualInterestRate: new FormControl(),
    paymentPerPeriod: new FormControl(),
    principalInvestmentAmount: new FormControl(),
    time: new FormControl()
  });
  public chart: Chart;
  public isLoading = true;
  public projectedTotalAmount: number;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private fireCalculatorService: FireCalculatorService,
    private formBuilder: FormBuilder
  ) {
    Chart.register(
      BarController,
      BarElement,
      CategoryScale,
      LinearScale,
      Tooltip
    );

    this.calculatorForm.setValue({
      annualInterestRate: 5,
      paymentPerPeriod: 500,
      principalInvestmentAmount: 0,
      time: 10
    });

    this.calculatorForm.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initialize();
      });
  }

  public ngAfterViewInit() {
    if (this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue({
          principalInvestmentAmount: this.fireWealth
        });
        this.calculatorForm.get('principalInvestmentAmount').disable();

        this.changeDetectorRef.markForCheck();
      });
    }
  }

  public ngOnChanges() {
    if (this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue({
          principalInvestmentAmount: this.fireWealth
        });
        this.calculatorForm.get('principalInvestmentAmount').disable();

        this.changeDetectorRef.markForCheck();
      });
    }
  }

  public ngOnDestroy() {
    this.chart?.destroy();

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private initialize() {
    this.isLoading = true;

    const chartData = this.getChartData();

    if (this.chartCanvas) {
      if (this.chart) {
        this.chart.data.labels = chartData.labels;
        this.chart.data.datasets[0].data = chartData.datasets[0].data;
        this.chart.data.datasets[1].data = chartData.datasets[1].data;

        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data: chartData,
          options: {
            plugins: {
              tooltip: {
                callbacks: {
                  label: (context) => {
                    let label = context.dataset.label || '';

                    if (label) {
                      label += ': ';
                    }

                    if (context.parsed.y !== null) {
                      label += new Intl.NumberFormat(this.locale, {
                        currency: this.currency,
                        currencyDisplay: 'code',
                        style: 'currency'
                      }).format(context.parsed.y);
                    }

                    return label;
                  }
                }
              }
            },
            responsive: true,
            scales: {
              x: {
                grid: {
                  display: false
                },
                stacked: true
              },
              y: {
                display: this.deviceType !== 'mobile',
                grid: {
                  display: false
                },
                stacked: true,
                ticks: {
                  callback: (value: number) => {
                    return transformTickToAbbreviation(value);
                  }
                }
              }
            }
          },
          type: 'bar'
        });
      }
    }

    this.isLoading = false;
  }

  private getChartData() {
    const currentYear = new Date().getFullYear();
    const labels = [];

    // Principal investment amount
    const P: number =
      this.calculatorForm.get('principalInvestmentAmount').value || 0;

    // Payment per period
    const PMT: number = parseFloat(
      this.calculatorForm.get('paymentPerPeriod').value
    );

    // Annual interest rate
    const r: number = this.calculatorForm.get('annualInterestRate').value / 100;

    // Time
    const t: number = parseFloat(this.calculatorForm.get('time').value);

    for (let year = currentYear; year < currentYear + t; year++) {
      labels.push(year);
    }

    const datasetInterest = {
      backgroundColor: `rgb(${secondaryColorRgb.r}, ${secondaryColorRgb.g}, ${secondaryColorRgb.b})`,
      data: [],
      label: 'Interest'
    };

    const datasetPrincipal = {
      backgroundColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
      data: [],
      label: 'Principal'
    };

    for (let period = 1; period <= t; period++) {
      const { interest, principal, totalAmount } =
        this.fireCalculatorService.calculateCompoundInterest({
          P,
          period,
          PMT,
          r
        });

      datasetPrincipal.data.push(principal.toNumber());
      datasetInterest.data.push(interest.toNumber());

      if (period === t - 1) {
        this.projectedTotalAmount = totalAmount.toNumber();
      }
    }

    return {
      labels,
      datasets: [datasetPrincipal, datasetInterest]
    };
  }
}
