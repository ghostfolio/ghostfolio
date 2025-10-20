import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';
import { Filter, PortfolioPosition, User } from '@ghostfolio/common/interfaces';
import { InternalRoute } from '@ghostfolio/common/routes/interfaces/internal-route.interface';
import { internalRoutes } from '@ghostfolio/common/routes/routes';
import { AccountWithPlatform, DateRange } from '@ghostfolio/common/types';

import { FocusKeyManager } from '@angular/cdk/a11y';
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
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { AssetClass, DataSource } from '@prisma/client';
import { differenceInYears } from 'date-fns';
import Fuse from 'fuse.js';
import { addIcons } from 'ionicons';
import {
  closeCircleOutline,
  closeOutline,
  searchOutline
} from 'ionicons/icons';
import { isFunction } from 'lodash';
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

import { translate } from '../i18n';
import {
  GfPortfolioFilterFormComponent,
  PortfolioFilterFormValue
} from '../portfolio-filter-form';
import { GfAssistantListItemComponent } from './assistant-list-item/assistant-list-item.component';
import { SearchMode } from './enums/search-mode';
import {
  DateRangeOption,
  SearchResultItem,
  SearchResults
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    GfAssistantListItemComponent,
    GfPortfolioFilterFormComponent,
    IonIcon,
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

  public accounts: AccountWithPlatform[] = [];
  public assetClasses: Filter[] = [];
  public dateRangeFormControl = new FormControl<string>(undefined);
  public dateRangeOptions: DateRangeOption[] = [];
  public holdings: PortfolioPosition[] = [];
  public isLoading = {
    accounts: false,
    assetProfiles: false,
    holdings: false,
    quickLinks: false
  };
  public isOpen = false;
  public placeholder = $localize`Find account, holding or page...`;
  public portfolioFilterFormControl = new FormControl<PortfolioFilterFormValue>(
    {
      account: null,
      assetClass: null,
      holding: null,
      tag: null
    }
  );
  public searchFormControl = new FormControl('');
  public searchResults: SearchResults = {
    accounts: [],
    assetProfiles: [],
    holdings: [],
    quickLinks: []
  };
  public tags: Filter[] = [];

  private readonly PRESELECTION_DELAY = 100;

  private filterTypes: Filter['type'][] = [
    'ACCOUNT',
    'ASSET_CLASS',
    'DATA_SOURCE',
    'SYMBOL',
    'TAG'
  ];

  private keyManager: FocusKeyManager<GfAssistantListItemComponent>;
  private preselectionTimeout: ReturnType<typeof setTimeout>;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {
    addIcons({ closeCircleOutline, closeOutline, searchOutline });
  }

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
            accounts: true,
            assetProfiles: true,
            holdings: true,
            quickLinks: true
          };
          this.searchResults = {
            accounts: [],
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
            accounts: [],
            assetProfiles: [],
            holdings: [],
            quickLinks: []
          } as SearchResults;

          if (!searchTerm) {
            return of(results).pipe(
              tap(() => {
                this.isLoading = {
                  accounts: false,
                  assetProfiles: false,
                  holdings: false,
                  quickLinks: false
                };
              })
            );
          }

          const accounts$: Observable<Partial<SearchResults>> =
            this.searchAccounts(searchTerm).pipe(
              map((accounts) => ({
                accounts: accounts.slice(
                  0,
                  GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
                )
              })),
              catchError((error) => {
                console.error('Error fetching accounts for assistant:', error);
                return of({ accounts: [] as SearchResultItem[] });
              }),
              tap(() => {
                this.isLoading.accounts = false;
                this.changeDetectorRef.markForCheck();
              })
            );

          const assetProfiles$: Observable<Partial<SearchResults>> = this
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
                  return of({ assetProfiles: [] as SearchResultItem[] });
                }),
                tap(() => {
                  this.isLoading.assetProfiles = false;
                  this.changeDetectorRef.markForCheck();
                })
              )
            : of({ assetProfiles: [] as SearchResultItem[] }).pipe(
                tap(() => {
                  this.isLoading.assetProfiles = false;
                  this.changeDetectorRef.markForCheck();
                })
              );

          const holdings$: Observable<Partial<SearchResults>> =
            this.searchHoldings(searchTerm).pipe(
              map((holdings) => ({
                holdings: holdings.slice(
                  0,
                  GfAssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
                )
              })),
              catchError((error) => {
                console.error('Error fetching holdings for assistant:', error);
                return of({ holdings: [] as SearchResultItem[] });
              }),
              tap(() => {
                this.isLoading.holdings = false;
                this.changeDetectorRef.markForCheck();
              })
            );

          const quickLinks$: Observable<Partial<SearchResults>> = of(
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

          return merge(accounts$, assetProfiles$, holdings$, quickLinks$).pipe(
            scan(
              (acc: SearchResults, curr: Partial<SearchResults>) => ({
                ...acc,
                ...curr
              }),
              {
                accounts: [],
                assetProfiles: [],
                holdings: [],
                quickLinks: []
              } as SearchResults
            )
          );
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe({
        next: (searchResults) => {
          this.searchResults = searchResults;

          this.preselectFirstItem();

          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Assistant search stream error:', error);
          this.searchResults = {
            accounts: [],
            assetProfiles: [],
            holdings: [],
            quickLinks: []
          };
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnChanges() {
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

    if (this.hasPermissionToChangeFilters) {
      this.portfolioFilterFormControl.enable({ emitEvent: false });
    } else {
      this.portfolioFilterFormControl.disable({ emitEvent: false });
    }

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
  }

  public initialize() {
    this.isLoading = {
      accounts: true,
      assetProfiles: true,
      holdings: true,
      quickLinks: true
    };
    this.keyManager = new FocusKeyManager(this.assistantListItems).withWrap();
    this.searchResults = {
      accounts: [],
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
      accounts: false,
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

        this.setPortfolioFilterFormValues();

        this.changeDetectorRef.markForCheck();
      });
  }

  public onApplyFilters() {
    const filterValue = this.portfolioFilterFormControl.value;

    this.filtersChanged.emit([
      {
        id: filterValue?.account,
        type: 'ACCOUNT'
      },
      {
        id: filterValue?.assetClass,
        type: 'ASSET_CLASS'
      },
      {
        id: filterValue?.holding?.dataSource,
        type: 'DATA_SOURCE'
      },
      {
        id: filterValue?.holding?.symbol,
        type: 'SYMBOL'
      },
      {
        id: filterValue?.tag,
        type: 'TAG'
      }
    ]);

    this.onCloseAssistant();
  }

  public onChangeDateRange(dateRangeString: string) {
    this.dateRangeChanged.emit(dateRangeString);
  }

  public onCloseAssistant() {
    this.portfolioFilterFormControl.reset();
    this.setIsOpen(false);

    this.closed.emit();
  }

  public onResetFilters() {
    this.portfolioFilterFormControl.reset();

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
    if (this.preselectionTimeout) {
      clearTimeout(this.preselectionTimeout);
    }

    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private getCurrentAssistantListItem() {
    return this.assistantListItems.find(({ getHasFocus }) => {
      return getHasFocus;
    });
  }

  private getFirstSearchResultItem() {
    if (this.searchResults.quickLinks?.length > 0) {
      return this.searchResults.quickLinks[0];
    }

    if (this.searchResults.accounts?.length > 0) {
      return this.searchResults.accounts[0];
    }

    if (this.searchResults.holdings?.length > 0) {
      return this.searchResults.holdings[0];
    }

    if (this.searchResults.assetProfiles?.length > 0) {
      return this.searchResults.assetProfiles[0];
    }

    return null;
  }

  private preselectFirstItem() {
    if (this.preselectionTimeout) {
      clearTimeout(this.preselectionTimeout);
    }

    this.preselectionTimeout = setTimeout(() => {
      if (!this.isOpen || !this.searchFormControl.value) {
        return;
      }

      const firstItem = this.getFirstSearchResultItem();

      if (!firstItem) {
        return;
      }

      for (const item of this.assistantListItems) {
        item.removeFocus();
      }

      this.keyManager.setFirstItemActive();

      const currentFocusedItem = this.getCurrentAssistantListItem();

      if (currentFocusedItem) {
        currentFocusedItem.focus();
      }

      this.changeDetectorRef.markForCheck();
    }, this.PRESELECTION_DELAY);
  }

  private searchAccounts(aSearchTerm: string): Observable<SearchResultItem[]> {
    return this.dataService
      .fetchAccounts({
        filters: [
          {
            id: aSearchTerm,
            type: 'SEARCH_QUERY'
          }
        ]
      })
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        map(({ accounts }) => {
          return accounts.map(({ id, name }) => {
            return {
              id,
              name,
              routerLink: internalRoutes.accounts.routerLink,
              mode: SearchMode.ACCOUNT as const
            };
          });
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private searchAssetProfiles(
    aSearchTerm: string
  ): Observable<SearchResultItem[]> {
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

  private searchHoldings(aSearchTerm: string): Observable<SearchResultItem[]> {
    return this.dataService
      .fetchPortfolioHoldings({
        filters: [
          {
            id: aSearchTerm,
            type: 'SEARCH_QUERY'
          }
        ]
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

  private searchQuickLinks(aSearchTerm: string): SearchResultItem[] {
    const searchTerm = aSearchTerm.toLowerCase();

    const allRoutes = Object.values(internalRoutes)
      .filter(({ excludeFromAssistant }) => {
        if (isFunction(excludeFromAssistant)) {
          return excludeFromAssistant(this.user);
        }

        return !excludeFromAssistant;
      })
      .reduce((acc, route) => {
        acc.push(route);
        if (route.subRoutes) {
          acc.push(...Object.values(route.subRoutes));
        }
        return acc;
      }, [] as InternalRoute[]);

    const fuse = new Fuse(allRoutes, {
      keys: ['title'],
      threshold: 0.3
    });

    return fuse.search(searchTerm).map(({ item: { routerLink, title } }) => {
      return {
        routerLink,
        mode: SearchMode.QUICK_LINK as const,
        name: title
      };
    });
  }

  private setPortfolioFilterFormValues() {
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

    this.portfolioFilterFormControl.setValue({
      account: this.user?.settings?.['filters.accounts']?.[0] ?? null,
      assetClass: this.user?.settings?.['filters.assetClasses']?.[0] ?? null,
      holding: selectedHolding ?? null,
      tag: this.user?.settings?.['filters.tags']?.[0] ?? null
    });
  }
}
