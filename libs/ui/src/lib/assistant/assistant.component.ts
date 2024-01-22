import { FocusKeyManager } from '@angular/cdk/a11y';
import {
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
import { FormControl } from '@angular/forms';
import { MatMenuTrigger } from '@angular/material/menu';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { User } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';
import { translate } from '@ghostfolio/ui/i18n';
import { Tag } from '@prisma/client';
import { EMPTY, Observable, Subject, lastValueFrom } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  mergeMap,
  takeUntil
} from 'rxjs/operators';

import { AssistantListItemComponent } from './assistant-list-item/assistant-list-item.component';
import { ISearchResultItem, ISearchResults } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-assistant',
  styleUrls: ['./assistant.scss'],
  templateUrl: './assistant.html'
})
export class AssistantComponent implements OnChanges, OnDestroy, OnInit {
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
  @Input() user: User;

  @Output() closed = new EventEmitter<void>();
  @Output() dateRangeChanged = new EventEmitter<DateRange>();
  @Output() selectedTagChanged = new EventEmitter<Tag>();

  @ViewChild('menuTrigger') menuTriggerElement: MatMenuTrigger;
  @ViewChild('search', { static: true }) searchElement: ElementRef;

  @ViewChildren(AssistantListItemComponent)
  assistantListItems: QueryList<AssistantListItemComponent>;

  public static readonly SEARCH_RESULTS_DEFAULT_LIMIT = 5;

  public dateRangeFormControl = new FormControl<string>(undefined);
  public readonly dateRangeOptions = [
    { label: $localize`Today`, value: '1d' },
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
    },
    { label: $localize`1Y`, value: '1y' },
    { label: $localize`5Y`, value: '5y' },
    { label: $localize`Max`, value: 'max' }
  ];
  public isLoading = false;
  public isOpen = false;
  public placeholder = $localize`Find holding...`;
  public searchFormControl = new FormControl('');
  public searchResults: ISearchResults = {
    assetProfiles: [],
    holdings: []
  };
  public tags: Tag[] = [];
  public tagsFormControl = new FormControl<string>(undefined);

  private keyManager: FocusKeyManager<AssistantListItemComponent>;
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService
  ) {}

  public ngOnInit() {
    const { tags } = this.dataService.fetchInfo();

    this.tags = tags.map(({ id, name }) => {
      return {
        id,
        name: translate(name)
      };
    });

    this.searchFormControl.valueChanges
      .pipe(
        map((searchTerm) => {
          this.isLoading = true;
          this.searchResults = {
            assetProfiles: [],
            holdings: []
          };

          this.changeDetectorRef.markForCheck();

          return searchTerm;
        }),
        debounceTime(300),
        distinctUntilChanged(),
        mergeMap(async (searchTerm) => {
          const result = <ISearchResults>{
            assetProfiles: [],
            holdings: []
          };

          try {
            if (searchTerm) {
              return await this.getSearchResults(searchTerm);
            }
          } catch {}

          return result;
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe((searchResults) => {
        this.searchResults = searchResults;
        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  public ngOnChanges() {
    this.dateRangeFormControl.setValue(this.user?.settings?.dateRange ?? null);
    this.tagsFormControl.setValue(
      this.user?.settings?.['filters.tags']?.[0] ?? null
    );
  }

  public async initialize() {
    this.isLoading = true;
    this.keyManager = new FocusKeyManager(this.assistantListItems).withWrap();
    this.searchResults = {
      assetProfiles: [],
      holdings: []
    };

    for (const item of this.assistantListItems) {
      item.removeFocus();
    }

    this.searchFormControl.setValue('');
    setTimeout(() => {
      this.searchElement?.nativeElement?.focus();
    });

    this.isLoading = false;
    this.setIsOpen(true);

    this.changeDetectorRef.markForCheck();
  }

  public onChangeDateRange(dateRangeString: string) {
    this.dateRangeChanged.emit(dateRangeString as DateRange);
  }

  public onCloseAssistant() {
    this.setIsOpen(false);

    this.closed.emit();
  }

  public onTagChange() {
    const selectedTag = this.tags.find(({ id }) => {
      return id === this.tagsFormControl.value;
    });

    this.selectedTagChanged.emit(selectedTag);

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

  private async getSearchResults(aSearchTerm: string) {
    let assetProfiles: ISearchResultItem[] = [];
    let holdings: ISearchResultItem[] = [];

    if (this.hasPermissionToAccessAdminControl) {
      try {
        assetProfiles = await lastValueFrom(
          this.searchAssetProfiles(aSearchTerm)
        );
        assetProfiles = assetProfiles.slice(
          0,
          AssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
        );
      } catch {}
    }

    try {
      holdings = await lastValueFrom(this.searchHoldings(aSearchTerm));
      holdings = holdings.slice(
        0,
        AssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
      );
    } catch {}

    return {
      assetProfiles,
      holdings
    };
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
        take: AssistantComponent.SEARCH_RESULTS_DEFAULT_LIMIT
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
                assetSubClassString: translate(assetSubClass)
              };
            }
          );
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }

  private searchHoldings(aSearchTerm: string): Observable<ISearchResultItem[]> {
    return this.dataService
      .fetchPositions({
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
        map(({ positions }) => {
          return positions.map(
            ({ assetSubClass, currency, dataSource, name, symbol }) => {
              return {
                currency,
                dataSource,
                name,
                symbol,
                assetSubClassString: translate(assetSubClass)
              };
            }
          );
        }),
        takeUntil(this.unsubscribeSubject)
      );
  }
}
