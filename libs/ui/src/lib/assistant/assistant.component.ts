import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition, User } from '@ghostfolio/common/interfaces';
import { IRoute } from '@ghostfolio/common/routes/interfaces/interfaces';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { DateRange } from '@ghostfolio/common/types';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { translate } from '@ghostfolio/ui/i18n';

import { FocusKeyManager } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { Account, AssetClass, DataSource } from '@prisma/client';
import { differenceInYears } from 'date-fns';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { EMPTY, Observable, Subject, merge, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  scan,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';

import { GfAssistantListItemComponent } from './assistant-list-item/assistant-list-item.component';
import { SearchMode } from './enums/search-mode';
import {
  IDateRangeOption,
  ISearchResultItem,
  ISearchResults
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    GfAssistantListItemComponent,
    GfEntityLogoComponent,
    GfSymbolModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-assistant',
  styleUrls: ['./assistant.scss'],
  templateUrl: './assistant.html'
})
export class GfAssistantComponent implements OnChanges, OnDestroy, OnInit {
  @HostListener('document:keydown', ['$event']) onKeydown(
    event: KeyboardEvent
  ) {
    if (!this.isOpen) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      for (const item of this.assistantListItems) {
        item.removeFocus();
      }

      this.keyManager.onKeydown(event);

      const currentAssistantListItem = this.getCurrentAssistantListItem();

      if (currentAssistantListItem?.linkElement) {
        currentAssistantListItem.linkElement.nativeElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    } else if (event.key === 'Enter') {
      const currentAssistantListItem = this.getCurrentAssistantListItem();

      if (currentAssistantListItem?.linkElement) {
        currentAssistantListItem.linkElement.nativeElement?.click();
        event.stopPropagation();
      }
    }
  }

  @Input() deviceType: string;
  @Input() hasPermissionToAccessAdminControl: boolean;
  @Input() hasPermissionToChangeDateRange: boolean;
  @Input() hasPermissionToChangeFilters: boolean;
  @Input() user: User;

  @Output() closed = new EventEmitter<void>();
  @Output() dateRangeChanged = new EventEmitter<DateRange>();
  @Output() filtersChanged = new EventEmitter<Filter[]>();

  @ViewChild('menuTrigger') menuTriggerElement: MatMenuTrigger;
  @ViewChild('search', { static: true }) searchElement: ElementRef;

  @ViewChildren(GfAssistantListItemComponent)
  assistantListItems: QueryList<GfAssistantListItemComponent>;

  public static readonly SEARCH_RESULTS_DEFAULT_LIMIT = 5;

  public accounts: Account[] = [];
  public assetClasses: Filter[] = [];
  public dateRangeFormControl = new FormControl<string>(undefined);
  public dateRangeOptions: IDateRangeOption[] = [];
  public filterForm = this.formBuilder.group({
    account: new FormControl<string>(undefined),
    assetClass: new FormControl<string>(undefined),
    holding: new FormControl<PortfolioPosition>(undefined),
    tag: new FormControl<string>(undefined)
  });
  public holdings: PortfolioPosition[] = [];
  public isLoading = {
    assetProfiles: false,
    holdings: false,
    quickLinks: false
  };
  public isOpen = false;
  public placeholder = $localize`Find holding or page...`;
  public searchFormControl = new FormControl('');
  public searchResults: ISearchResults = {
    assetProfiles: [],
    holdings: [],
    quickLinks: []
  };
  public tags: Filter[] = [];

  private filterTypes: Filter['type'][] = [
    'ACCOUNT',
    'ASSET_CLASS',
    'DATA_SOURCE',
    'SYMBOL',
    'TAG'
  ];
  private keyManager: FocusKeyManager<GfAssistantListItemComponent>;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.assetClasses = Object.keys(AssetClass).map((assetClass) => {
      return {
        id: assetClass,
        label: translate(assetClass),
        type: 'ASSET_CLASS'
      };
    });

    this.searchFormControl.valueChanges
      .pipe(
        map((searchTerm) => {
          this.isLoading = {
            assetProfiles: true,
            holdings: true,
            quickLinks: true
          };
          this.searchResults = {
            assetProfiles: [],
            holdings: [],
            quickLinks: []
          };

          this.changeDetectorRef.markForCheck();

          return searchTerm?.trim();
        }),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((searchTerm) => {
          const results = {
            assetProfiles: [],
            holdings: [],
            quickLinks: []
          } as ISearchResults;

          if (!searchTerm) {
            return of(results).pipe(
              tap(() => {
                this.isLoading = {
                  assetProfiles: false,
                  holdings: false,
                  quickLinks: false
                };
              })
            );
          }

          // Asset profiles
          const assetProfiles$: Observable<Partial<ISearchResults>> = this
            .hasPermissionToAccessAdminControl
            ? this.searchAssetProfiles(searchTerm).pipe(
                map((assetProfiles) => ({
                  assetProfiles: assetProfiles.slice(
                    0,
                    GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
                  )
                })),
                catchError((error) => {
                  console.error(
                    'Error fetching asset profiles for assistant:',
                    error
                  );
                  return of({ assetProfiles: [] as ISearchResultItem[] });
                }),
                tap(() => {
                  this.isLoading.assetProfiles = false;
                  this.changeDetectorRef.markForCheck();
                })
              )
            : of({ assetProfiles: [] as ISearchResultItem[] }).pipe(
                tap(() => {
                  this.isLoading.assetProfiles = false;
                  this.changeDetectorRef.markForCheck();
                })
              );

          // Holdings
          const holdings$: Observable<Partial<ISearchResults>> =
            this.searchHoldings(searchTerm).pipe(
              map((holdings) => ({
                holdings: holdings.slice(
                  0,
                  GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
                )
              })),
              catchError((error) => {
                console.error('Error fetching holdings for assistant:', error);
                return of({ holdings: [] as ISearchResultItem[] });
              }),
              tap(() => {
                this.isLoading.holdings = false;
                this.changeDetectorRef.markForCheck();
              })
            );

          // Quick links
          const quickLinks$: Observable<Partial<ISearchResults>> = of(
            this.searchQuickLinks(searchTerm)
          ).pipe(
            map((quickLinks) => ({
              quickLinks: quickLinks.slice(
                0,
                GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
              )
            })),
            tap(() => {
              this.isLoading.quickLinks = false;
              this.changeDetectorRef.markForCheck();
            })
          );

          // Merge all results
          return merge(quickLinks$, assetProfiles$, holdings$).pipe(
            scan(
              (acc: ISearchResults, curr: Partial<ISearchResults>) => ({
                ...acc,
                ...curr
              }),
              {
                assetProfiles: [],
                holdings: [],
                quickLinks: []
              } as ISearchResults
            )
          );
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe({
        next: (searchResults) => {
          this.searchResults = searchResults;
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Assistant search stream error:', error);
          this.searchResults = {
            assetProfiles: [],
            holdings: [],
            quickLinks: []
          };
          this.changeDetectorRef.markForCheck();
        },
        complete: () => {
          this.isLoading = {
            assetProfiles: false,
            holdings: false,
            quickLinks: false
          };
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnChanges() {
    this.accounts = this.user?.accounts ?? [];

    this.dateRangeOptions = [
      {
        label: $localize`Today`,
        value: '1d'
      },
      {
        label: $localize`Week to date` + ' (' + $localize`WTD` + ')',
        value: 'wtd'
      },
      {
        label: $localize`Month to date` + ' (' + $localize`MTD` + ')',
        value: 'mtd'
      },
      {
        label: $localize`Year to date` + ' (' + $localize`YTD` + ')',
        value: 'ytd'
      }
    ];

    if (
      this.user?.dateOfFirstActivity &&
      differenceInYears(new Date(), this.user.dateOfFirstActivity) >= 1
    ) {
      this.dateRangeOptions.push({
        label: '1 ' + $localize`year` + ' (' + $localize`1Y` + ')',
        value: '1y'
      });
    }

    // TODO
    // if (this.user?.settings?.isExperimentalFeatures) {
    //   this.dateRangeOptions = this.dateRangeOptions.concat(
    //     eachYearOfInterval({
    //       end: new Date(),
    //       start: this.user?.dateOfFirstActivity ?? new Date()
    //     })
    //       .map((date) => {
    //         return { label: format(date, 'yyyy'), value: format(date, 'yyyy') };
    //       })
    //       .slice(0, -1)
    //       .reverse()
    //   );
    // }

    if (
      this.user?.dateOfFirstActivity &&
      differenceInYears(new Date(), this.user.dateOfFirstActivity) >= 5
    ) {
      this.dateRangeOptions.push({
        label: '5 ' + $localize`years` + ' (' + $localize`5Y` + ')',
        value: '5y'
      });
    }

    this.dateRangeOptions.push({
      label: $localize`Max`,
      value: 'max'
    });

    this.dateRangeFormControl.disable({ emitEvent: false });

    if (this.hasPermissionToChangeDateRange) {
      this.dateRangeFormControl.enable({ emitEvent: false });
    }

    this.dateRangeFormControl.setValue(this.user?.settings?.dateRange ?? null);

    this.filterForm.disable({ emitEvent: false });

    this.tags =
      this.user?.tags
        ?.filter(({ isUsed }) => {
          return isUsed;
        })
        .map(({ id, name }) => {
          return {
            id,
            label: translate(name),
            type: 'TAG'
          };
        }) ?? [];

    if (this.tags.length === 0) {
      this.filterForm.get('tag').disable({ emitEvent: false });
    }
  }

  public hasFilter(aFormValue: { [key: string]: string }) {
    return Object.values(aFormValue).some((value) => {
      return !!value;
    });
  }

  public holdingComparisonFunction(
    option: PortfolioPosition,
    value: PortfolioPosition
  ): boolean {
    if (value === null) {
      return false;
    }

    return (
      getAssetProfileIdentifier(option) === getAssetProfileIdentifier(value)
    );
  }

  public initialize() {
    this.isLoading = {
      assetProfiles: true,
      holdings: true,
      quickLinks: true
    };
    this.keyManager = new FocusKeyManager(this.assistantListItems).withWrap();
    this.searchResults = {
      assetProfiles: [],
      holdings: [],
      quickLinks: []
    };

    for (const item of this.assistantListItems) {
      item.removeFocus();
    }

    this.searchFormControl.setValue('');
    setTimeout(() => {
      this.searchElement?.nativeElement?.focus();
    });

    this.isLoading = {
      assetProfiles: false,
      holdings: false,
      quickLinks: false
    };
    this.setIsOpen(true);

    this.dataService
      .fetchPortfolioHoldings()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ holdings }) => {
        this.holdings = holdings
          .filter(({ assetSubClass }) => {
            return !['CASH'].includes(assetSubClass);
          })
          .sort((a, b) => {
            return a.name?.localeCompare(b.name);
          });
        this.setFilterFormValues();

        if (this.hasPermissionToChangeFilters) {
          this.filterForm.enable({ emitEvent: false });
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  public onApplyFilters() {
    this.filtersChanged.emit([
      {
        id: this.filterForm.get('account').value,
        type: 'ACCOUNT'
      },
      {
        id: this.filterForm.get('assetClass').value,
        type: 'ASSET_CLASS'
      },
      {
        id: this.filterForm.get('holding').value?.dataSource,
        type: 'DATA_SOURCE'
      },
      {
        id: this.filterForm.get('holding').value?.symbol,
        type: 'SYMBOL'
      },
      {
        id: this.filterForm.get('tag').value,
        type: 'TAG'
      }
    ]);

    this.onCloseAssistant();
  }

  public onChangeDateRange(dateRangeString: string) {
    this.dateRangeChanged.emit(dateRangeString as DateRange);
  }

  public onCloseAssistant() {
    this.setIsOpen(false);

    this.closed.emit();
  }

  public onResetFilters() {
    this.filtersChanged.emit(
      this.filterTypes.map((type) => {
        return {
          type,
          id: null
        };
      })
    );

    this.onCloseAssistant();
  }

  public setIsOpen(aIsOpen: boolean) {
    this.isOpen = aIsOpen;
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private getCurrentAssistantListItem() {
    return this.assistantListItems.find(({ getHasFocus }) => {
      return getHasFocus;
    });
  }

  private searchAssetProfiles(
    aSearchTerm: string
  ): Observable<ISearchResultItem[]> {
    return this.adminService
      .fetchAdminMarketData({
        filters: [
          {
            id: aSearchTerm,
            type: 'SEARCH_QUERY'
          }
        ],
        take: GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
      })
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        map(({ marketData }) => {
          return marketData.map(
            ({ assetSubClass, currency, dataSource, name, symbol }) => {
              return {
                currency,
                dataSource,
                name,
                symbol,
                assetSubClassString: translate(assetSubClass),
                mode: SearchMode.ASSET_PROFILE as const
              };
            }
          );
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private searchHoldings(aSearchTerm: string): Observable<ISearchResultItem[]> {
    return this.dataService
      .fetchPortfolioHoldings({
        filters: [
          {
            id: aSearchTerm,
            type: 'SEARCH_QUERY'
          }
        ],
        range: '1d'
      })
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        map(({ holdings }) => {
          return holdings.map(
            ({ assetSubClass, currency, dataSource, name, symbol }) => {
              return {
                currency,
                dataSource,
                name,
                symbol,
                assetSubClassString: translate(assetSubClass),
                mode: SearchMode.HOLDING as const
              };
            }
          );
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private searchQuickLinks(aSearchTerm: string): ISearchResultItem[] {
    const searchTerm = aSearchTerm.toLowerCase();

    const allRoutes = Object.values(internalRoutes)
      .filter(({ excludeFromAssistant }) => {
        if (typeof excludeFromAssistant === 'function') {
          return !excludeFromAssistant(this.user);
        }

        return !excludeFromAssistant;
      })
      .reduce((acc, route) => {
        acc.push(route);
        if (route.subRoutes) {
          acc.push(...Object.values(route.subRoutes));
        }
        return acc;
      }, [] as IRoute[]);

    return allRoutes
      .filter(({ title }) => {
        return title.toLowerCase().includes(searchTerm);
      })
      .map(({ routerLink, title }) => {
        return {
          routerLink,
          mode: SearchMode.QUICK_LINK as const,
          name: title
        };
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
  }

  private setFilterFormValues() {
    const dataSource = this.user?.settings?.[
      'filters.dataSource'
    ] as DataSource;
    const symbol = this.user?.settings?.['filters.symbol'];
    const selectedHolding = this.holdings.find((holding) => {
      return (
        getAssetProfileIdentifier({
          dataSource: holding.dataSource,
          symbol: holding.symbol
        }) === getAssetProfileIdentifier({ dataSource, symbol })
      );
    });

    this.filterForm.setValue(
      {
        account: this.user?.settings?.['filters.accounts']?.[0] ?? null,
        assetClass: this.user?.settings?.['filters.assetClasses']?.[0] ?? null,
        holding: selectedHolding ?? null,
        tag: this.user?.settings?.['filters.tags']?.[0] ?? null
      },
      {
        emitEvent: false
      }
    );
  }
}
