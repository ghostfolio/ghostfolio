import {
  getTooltipOptions,
  transformTickToAbbreviation
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb } from '@ghostfolio/common/config';
import { getLocale } from '@ghostfolio/common/helper';
import { ColorScheme } from '@ghostfolio/common/types';

import {
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
import { MatDatepicker } from '@angular/material/datepicker';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import * as Color from 'color';
import {
  add,
  addYears,
  getMonth,
  setMonth,
  setYear,
  startOfMonth,
  sub
} from 'date-fns';
import { isNumber } from 'lodash';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { FireCalculatorService } from './fire-calculator.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-fire-calculator',
  styleUrls: ['./fire-calculator.component.scss'],
  templateUrl: './fire-calculator.component.html'
})
export class FireCalculatorComponent implements OnChanges, OnDestroy {
  @Input() annualInterestRate = 5;
  @Input() colorScheme: ColorScheme;
  @Input() currency: string;
  @Input() deviceType: string;
  @Input() fireWealth: number;
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() locale = getLocale();
  @Input() projectedTotalAmount = 0;
  @Input() retirementDate: Date;
  @Input() savingsRate = 0;

  @Output() annualInterestRateChanged = new EventEmitter<number>();
  @Output() projectedTotalAmountChanged = new EventEmitter<number>();
  @Output() retirementDateChanged = new EventEmitter<Date>();
  @Output() savingsRateChanged = new EventEmitter<number>();

  @ViewChild('chartCanvas') chartCanvas;

  public calculatorForm = this.formBuilder.group({
    annualInterestRate: new FormControl<number>(undefined),
    paymentPerPeriod: new FormControl<number>(undefined),
    principalInvestmentAmount: new FormControl<number>(undefined),
    projectedTotalAmount: new FormControl<number>(undefined),
    retirementDate: new FormControl<Date>(undefined)
  });
  public chart: Chart<'bar'>;
  public isLoading = true;
  public periodsToRetire = 0;

  private readonly CONTRIBUTION_PERIOD = 12;
  private readonly DEFAULT_RETIREMENT_DATE = startOfMonth(
    addYears(new Date(), 10)
  );
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
        annualInterestRate: this.annualInterestRate,
        paymentPerPeriod: this.savingsRate,
        principalInvestmentAmount: 0,
        projectedTotalAmount: this.projectedTotalAmount,
        retirementDate: this.retirementDate ?? this.DEFAULT_RETIREMENT_DATE
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
      .get('annualInterestRate')
      .valueChanges.pipe(debounceTime(500), takeUntil(this.unsubscribeSubject))
      .subscribe((annualInterestRate) => {
        this.annualInterestRateChanged.emit(annualInterestRate);
      });
    this.calculatorForm
      .get('paymentPerPeriod')
      .valueChanges.pipe(debounceTime(500), takeUntil(this.unsubscribeSubject))
      .subscribe((savingsRate) => {
        this.savingsRateChanged.emit(savingsRate);
      });
    this.calculatorForm
      .get('projectedTotalAmount')
      .valueChanges.pipe(debounceTime(500), takeUntil(this.unsubscribeSubject))
      .subscribe((projectedTotalAmount) => {
        this.projectedTotalAmountChanged.emit(projectedTotalAmount);
      });
    this.calculatorForm
      .get('retirementDate')
      .valueChanges.pipe(debounceTime(500), takeUntil(this.unsubscribeSubject))
      .subscribe((retirementDate) => {
        this.retirementDateChanged.emit(retirementDate);
      });
  }

  public ngOnChanges() {
    this.periodsToRetire = this.getPeriodsToRetire();

    if (isNumber(this.fireWealth) && this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue(
          {
            annualInterestRate: this.annualInterestRate,
            principalInvestmentAmount: this.fireWealth,
            paymentPerPeriod: this.savingsRate ?? 0,
            projectedTotalAmount:
              Number(this.getProjectedTotalAmount().toFixed(0)) ?? 0,
            retirementDate:
              this.getRetirementDate() ?? this.DEFAULT_RETIREMENT_DATE
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
      this.calculatorForm
        .get('annualInterestRate')
        .enable({ emitEvent: false });
      this.calculatorForm.get('paymentPerPeriod').enable({ emitEvent: false });
      this.calculatorForm
        .get('projectedTotalAmount')
        .enable({ emitEvent: false });
    } else {
      this.calculatorForm
        .get('annualInterestRate')
        .disable({ emitEvent: false });
      this.calculatorForm.get('paymentPerPeriod').disable({ emitEvent: false });
      this.calculatorForm
        .get('projectedTotalAmount')
        .disable({ emitEvent: false });
    }

    this.calculatorForm.get('retirementDate').disable({ emitEvent: false });
  }

  public setMonthAndYear(
    normalizedMonthAndYear: Date,
    datepicker: MatDatepicker<Date>
  ) {
    const retirementDate = this.calculatorForm.get('retirementDate').value;
    const newRetirementDate = setMonth(
      setYear(retirementDate, normalizedMonthAndYear.getFullYear()),
      normalizedMonthAndYear.getMonth()
    );
    this.calculatorForm.get('retirementDate').setValue(newRetirementDate);
    datepicker.close();
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
                ...getTooltipOptions({ colorScheme: this.colorScheme }),
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
    const P: number = this.getP();

    // Payment per period
    const PMT = this.getPMT();

    // Annual interest rate
    const r: number = this.getR();

    // Calculate retirement date
    // if we want to retire at month x, we need the projectedTotalAmount at month x-1
    const lastPeriodDate = sub(this.getRetirementDate(), { months: 1 });
    const yearsToRetire = lastPeriodDate.getFullYear() - currentYear;

    // Time
    // +1 to take into account the current year
    const t = yearsToRetire + 1;

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
      const { interest, principal } =
        this.fireCalculatorService.calculateCompoundInterest({
          P,
          periodInMonths,
          PMT,
          r
        });

      datasetDeposit.data.push(this.fireWealth);
      datasetInterest.data.push(interest.toNumber());
      datasetSavings.data.push(principal.minus(this.fireWealth).toNumber());
    }

    return {
      labels,
      datasets: [datasetDeposit, datasetSavings, datasetInterest]
    };
  }

  private getP() {
    return this.fireWealth || 0;
  }

  private getPeriodsToRetire(): number {
    if (this.projectedTotalAmount) {
      const periods = this.fireCalculatorService.calculatePeriodsToRetire({
        P: this.getP(),
        totalAmount: this.projectedTotalAmount,
        PMT: this.getPMT(),
        r: this.getR()
      });

      return periods;
    } else {
      const today = new Date();
      const retirementDate =
        this.retirementDate ?? this.DEFAULT_RETIREMENT_DATE;

      return (
        12 * (retirementDate.getFullYear() - today.getFullYear()) +
        retirementDate.getMonth() -
        today.getMonth()
      );
    }
  }

  private getPMT() {
    return this.savingsRate ?? 0;
  }

  private getProjectedTotalAmount() {
    if (this.projectedTotalAmount) {
      return this.projectedTotalAmount || 0;
    } else {
      const { totalAmount } =
        this.fireCalculatorService.calculateCompoundInterest({
          P: this.getP(),
          periodInMonths: this.periodsToRetire,
          PMT: this.getPMT(),
          r: this.getR()
        });

      return totalAmount.toNumber();
    }
  }

  private getR() {
    return this.calculatorForm.get('annualInterestRate').value / 100;
  }

  private getRetirementDate(): Date {
    const monthsToRetire = this.periodsToRetire % 12;
    const yearsToRetire = Math.floor(this.periodsToRetire / 12);

    return startOfMonth(
      add(new Date(), {
        months: monthsToRetire,
        years: yearsToRetire
      })
    );
  }
}
