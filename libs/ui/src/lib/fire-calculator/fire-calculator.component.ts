import 'chartjs-adapter-date-fns';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { getTooltipOptions } from '@ghostfolio/common/chart-helper';
import { primaryColorRgb } from '@ghostfolio/common/config';
import { transformTickToAbbreviation } from '@ghostfolio/common/helper';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip
} from 'chart.js';
import * as Color from 'color';
import { getMonth } from 'date-fns';
import { isNumber } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

import { FireCalculatorService } from './fire-calculator.service';

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
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() locale: string;
  @Input() savingsRate = 0;

  @Output() savingsRateChanged = new EventEmitter<number>();

  @ViewChild('chartCanvas') chartCanvas;

  public calculatorForm = this.formBuilder.group({
    annualInterestRate: new FormControl<number>(undefined),
    paymentPerPeriod: new FormControl<number>(undefined),
    principalInvestmentAmount: new FormControl<number>(undefined),
    time: new FormControl<number>(undefined)
  });
  public chart: Chart;
  public isLoading = true;
  public projectedTotalAmount: number;

  private readonly CONTRIBUTION_PERIOD = 12;
  private unsubscribeSubject = new Subject<void>();

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

    this.calculatorForm.setValue(
      {
        annualInterestRate: 5,
        paymentPerPeriod: this.savingsRate,
        principalInvestmentAmount: 0,
        time: 10
      },
      {
        emitEvent: false
      }
    );

    this.calculatorForm.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initialize();
      });

    this.calculatorForm
      .get('paymentPerPeriod')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((savingsRate) => {
        this.savingsRateChanged.emit(savingsRate);
      });
  }

  public ngAfterViewInit() {
    if (isNumber(this.fireWealth) && this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue(
          {
            principalInvestmentAmount: this.fireWealth,
            paymentPerPeriod: this.savingsRate ?? 0
          },
          {
            emitEvent: false
          }
        );
        this.calculatorForm.get('principalInvestmentAmount').disable();

        this.changeDetectorRef.markForCheck();
      });
    }

    if (this.hasPermissionToUpdateUserSettings === true) {
      this.calculatorForm.get('paymentPerPeriod').enable({ emitEvent: false });
    } else {
      this.calculatorForm.get('paymentPerPeriod').disable({ emitEvent: false });
    }
  }

  public ngOnChanges() {
    if (isNumber(this.fireWealth) && this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue(
          {
            principalInvestmentAmount: this.fireWealth,
            paymentPerPeriod: this.savingsRate ?? 0
          },
          {
            emitEvent: false
          }
        );
        this.calculatorForm.get('principalInvestmentAmount').disable();

        this.changeDetectorRef.markForCheck();
      });
    }

    if (this.hasPermissionToUpdateUserSettings === true) {
      this.calculatorForm.get('paymentPerPeriod').enable({ emitEvent: false });
    } else {
      this.calculatorForm.get('paymentPerPeriod').disable({ emitEvent: false });
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

        for (let index = 0; index < this.chart.data.datasets.length; index++) {
          this.chart.data.datasets[index].data = chartData.datasets[index].data;
        }

        this.chart.update();
      } else {
        this.chart = new Chart(this.chartCanvas.nativeElement, {
          data: chartData,
          options: {
            plugins: {
              tooltip: {
                ...getTooltipOptions(),
                mode: 'index',
                callbacks: {
                  footer: (items) => {
                    const totalAmount = items.reduce(
                      (a, b) => a + b.parsed.y,
                      0
                    );

                    return `Total: ${new Intl.NumberFormat(this.locale, {
                      currency: this.currency,
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore: Only supported from ES2020 or later
                      currencyDisplay: 'code',
                      style: 'currency'
                    }).format(totalAmount)}`;
                  },
                  label: (context) => {
                    let label = context.dataset.label || '';

                    if (label) {
                      label += ': ';
                    }

                    if (context.parsed.y !== null) {
                      label += new Intl.NumberFormat(this.locale, {
                        currency: this.currency,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore: Only supported from ES2020 or later
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
                position: 'right',
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
    const PMT = this.calculatorForm.get('paymentPerPeriod').value;

    // Annual interest rate
    const r: number = this.calculatorForm.get('annualInterestRate').value / 100;

    // Time
    const t = this.calculatorForm.get('time').value;

    for (let year = currentYear; year < currentYear + t; year++) {
      labels.push(year);
    }

    const datasetDeposit = {
      backgroundColor: `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`,
      data: [],
      label: $localize`Deposit`
    };

    const datasetInterest = {
      backgroundColor: Color(
        `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`
      )
        .lighten(0.5)
        .hex(),
      data: [],
      label: $localize`Interest`
    };

    const datasetSavings = {
      backgroundColor: Color(
        `rgb(${primaryColorRgb.r}, ${primaryColorRgb.g}, ${primaryColorRgb.b})`
      )
        .lighten(0.25)
        .hex(),
      data: [],
      label: $localize`Savings`
    };

    const monthsPassedInCurrentYear = getMonth(new Date());

    for (let period = 1; period <= t; period++) {
      const periodInMonths =
        period * this.CONTRIBUTION_PERIOD - monthsPassedInCurrentYear;
      const { interest, principal, totalAmount } =
        this.fireCalculatorService.calculateCompoundInterest({
          P,
          periodInMonths,
          PMT,
          r
        });

      datasetDeposit.data.push(this.fireWealth);
      datasetInterest.data.push(interest.toNumber());
      datasetSavings.data.push(principal.minus(this.fireWealth).toNumber());

      if (period === t) {
        this.projectedTotalAmount = totalAmount.toNumber();
      }
    }

    return {
      labels,
      datasets: [datasetDeposit, datasetSavings, datasetInterest]
    };
  }
}
