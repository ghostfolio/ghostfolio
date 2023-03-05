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
import { MatDatepicker } from '@angular/material/datepicker';
import {
  getTooltipOptions,
  transformTickToAbbreviation
} from '@ghostfolio/common/chart-helper';
import { primaryColorRgb } from '@ghostfolio/common/config';
import { ColorScheme } from '@ghostfolio/common/types';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip
} from 'chart.js';
import * as Color from 'color';
import { add, getMonth, sub } from 'date-fns';
import { isNumber } from 'lodash';
import { Subject, takeUntil } from 'rxjs';

import { FireCalculatorService } from './fire-calculator.service';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS
} from '@angular/material-moment-adapter';
// Depending on whether rollup is used, moment needs to be imported differently.
// Since Moment.js doesn't have a default export, we normally need to import using the `* as`
// syntax. However, rollup creates a synthetic default module and we thus need to import it using
// the `default as` syntax.
import * as _moment from 'moment';
// tslint:disable-next-line:no-duplicate-imports
import { default as _rollupMoment, Moment } from 'moment';

const moment = _rollupMoment || _moment;

// See the Moment.js docs for the meaning of these formats:
// https://momentjs.com/docs/#/displaying/format/
export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY'
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

export const DEFAULT_RETIREMENT_DATE = add(new Date(), { years: 10 });

@Component({
  selector: 'gf-fire-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fire-calculator.component.html',
  styleUrls: ['./fire-calculator.component.scss'],
  providers: [
    // `MomentDateAdapter` can be automatically provided by importing `MomentDateModule` in your
    // application's root module. We provide it at the component level here, due to limitations of
    // our example generation script.
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS }
  ]
})
export class FireCalculatorComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() colorScheme: ColorScheme;
  @Input() currency: string;
  @Input() deviceType: string;
  @Input() fireWealth: number;
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() locale: string;
  @Input() retirementDate: string;
  @Input() savingsRate = 0;
  @Input() projectedTotalAmount = 0;
  @Input() projectedTotalAmountSet: boolean;

  @Output() retirementDateChanged = new EventEmitter<Date>();
  @Output() savingsRateChanged = new EventEmitter<number>();
  @Output() projectedTotalAmountChanged = new EventEmitter<number>();

  @ViewChild('chartCanvas') chartCanvas;

  public calculatorForm = this.formBuilder.group({
    annualInterestRate: new FormControl<number>(undefined),
    paymentPerPeriod: new FormControl<number>(undefined),
    principalInvestmentAmount: new FormControl<number>(undefined),
    projectedTotalAmount: new FormControl<number>(undefined),
    retirementDate: new FormControl(moment())
  });
  public chart: Chart<'bar'>;
  public isLoading = true;
  public periodsToRetire = 0;
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
        projectedTotalAmount: this.projectedTotalAmount,
        retirementDate: moment(this.retirementDate)
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
    this.calculatorForm
      .get('retirementDate')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((retirementDate) => {
        this.retirementDateChanged.emit(retirementDate.toDate());
      });
    this.calculatorForm
      .get('projectedTotalAmount')
      .valueChanges.pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((projectedTotalAmount) => {
        this.projectedTotalAmountChanged.emit(projectedTotalAmount);
      });
  }

  public ngAfterViewInit() {
    if (isNumber(this.fireWealth) && this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue(
          {
            principalInvestmentAmount: this.getP(),
            paymentPerPeriod: this.getPMT(),
            retirementDate: moment(
              this.getRetirementDate() || DEFAULT_RETIREMENT_DATE
            ),
            projectedTotalAmount:
              Number(this.getProjectedTotalAmount().toFixed(2)) ?? 0
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
      this.calculatorForm.get('retirementDate').enable({ emitEvent: false });

      this.calculatorForm
        .get('projectedTotalAmount')
        .enable({ emitEvent: false });
    } else {
      this.calculatorForm.get('paymentPerPeriod').disable({ emitEvent: false });
      this.calculatorForm.get('retirementDate').disable({ emitEvent: false });
      this.calculatorForm
        .get('projectedTotalAmount')
        .disable({ emitEvent: false });
    }
  }

  public ngOnChanges() {
    this.periodsToRetire = this.getPeriodsToRetire();
    if (isNumber(this.fireWealth) && this.fireWealth >= 0) {
      setTimeout(() => {
        // Wait for the chartCanvas
        this.calculatorForm.patchValue(
          {
            principalInvestmentAmount: this.fireWealth,
            paymentPerPeriod: this.savingsRate ?? 0,
            retirementDate: moment(
              this.getRetirementDate() || DEFAULT_RETIREMENT_DATE
            ),
            projectedTotalAmount:
              Number(this.getProjectedTotalAmount().toFixed(2)) ?? 0
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
      this.calculatorForm.get('retirementDate').enable({ emitEvent: false });
      this.calculatorForm
        .get('projectedTotalAmount')
        .enable({ emitEvent: false });
    } else {
      this.calculatorForm.get('paymentPerPeriod').disable({ emitEvent: false });
      this.calculatorForm.get('retirementDate').disable({ emitEvent: false });
      this.calculatorForm
        .get('projectedTotalAmount')
        .disable({ emitEvent: false });
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

  private getP() {
    return this.fireWealth || 0;
  }

  private getPMT() {
    return this.savingsRate ?? 0;
  }

  private getR() {
    return this.calculatorForm.get('annualInterestRate').value / 100;
  }

  private getProjectedTotalAmount() {
    if (this.projectedTotalAmountSet) {
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

  private getPeriodsToRetire(): number {
    if (this.projectedTotalAmountSet) {
      const periods = this.fireCalculatorService.calculatePeriodsToRetire({
        P: this.getP(),
        totalAmount: this.projectedTotalAmount,
        PMT: this.getPMT(),
        r: this.getR()
      });

      return periods;
    } else {
      const today = new Date();
      const retirementDate = this.retirementDate
        ? new Date(this.retirementDate)
        : DEFAULT_RETIREMENT_DATE;

      return (
        12 * (retirementDate.getFullYear() - today.getFullYear()) +
        retirementDate.getMonth() -
        today.getMonth()
      );
    }
  }

  private getRetirementDate(): Date {
    const yearsToRetire = Math.floor(this.periodsToRetire / 12);
    const monthsToRetire = this.periodsToRetire % 12;

    return add(new Date(), {
      years: yearsToRetire,
      months: monthsToRetire
    });
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
    }

    return {
      labels,
      datasets: [datasetDeposit, datasetSavings, datasetInterest]
    };
  }

  setMonthAndYear(
    normalizedMonthAndYear: Moment,
    datepicker: MatDatepicker<Moment>
  ) {
    const ctrlValue = this.calculatorForm.get('retirementDate').value!;
    ctrlValue.month(normalizedMonthAndYear.month());
    ctrlValue.year(normalizedMonthAndYear.year());
    this.calculatorForm.get('retirementDate').setValue(ctrlValue);
    datepicker.close();
  }
}
