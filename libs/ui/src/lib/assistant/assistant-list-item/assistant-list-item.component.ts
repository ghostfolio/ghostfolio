import { GfSymbolPipe } from '@ghostfolio/common/pipes';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { FocusableOption } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  ViewChild
} from '@angular/core';
import { Params, RouterModule } from '@angular/router';

import { SearchMode } from '../enums/search-mode';
import {
  AssetSearchResultItem,
  SearchResultItem
} from '../interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfSymbolPipe, RouterModule],
  selector: 'gf-assistant-list-item',
  styleUrls: ['./assistant-list-item.scss'],
  templateUrl: './assistant-list-item.html'
})
export class GfAssistantListItemComponent
  implements FocusableOption, OnChanges
{
  @HostBinding('attr.tabindex') tabindex = -1;
  @HostBinding('class.has-focus') get getHasFocus() {
    return this.hasFocus;
  }

  @Input() item: SearchResultItem;

  @Output() clicked = new EventEmitter<void>();

  @ViewChild('link') public linkElement: ElementRef;

  public hasFocus = false;
  public queryParams: Params;
  public routerLink: string[];

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnChanges() {
    if (this.item?.mode === SearchMode.ACCOUNT) {
      this.queryParams = {
        accountDetailDialog: true,
        accountId: this.item.id
      };

      this.routerLink = internalRoutes.accounts.routerLink;
    } else if (this.item?.mode === SearchMode.ASSET_PROFILE) {
      this.queryParams = {
        assetProfileDialog: true,
        dataSource: this.item.dataSource,
        symbol: this.item.symbol
      };

      this.routerLink =
        internalRoutes.adminControl.subRoutes.marketData.routerLink;
    } else if (this.item?.mode === SearchMode.HOLDING) {
      this.queryParams = {
        dataSource: this.item.dataSource,
        holdingDetailDialog: true,
        symbol: this.item.symbol
      };

      this.routerLink = [];
    } else if (this.item?.mode === SearchMode.QUICK_LINK) {
      this.queryParams = {};
      this.routerLink = this.item.routerLink;
    }
  }

  public focus() {
    this.hasFocus = true;

    this.changeDetectorRef.markForCheck();
  }

  public isAsset(item: SearchResultItem): item is AssetSearchResultItem {
    return (
      (item.mode === SearchMode.ASSET_PROFILE ||
        item.mode === SearchMode.HOLDING) &&
      !!item.dataSource &&
      !!item.symbol
    );
  }

  public onClick() {
    this.clicked.emit();
  }

  public removeFocus() {
    this.hasFocus = false;

    this.changeDetectorRef.markForCheck();
  }
}
