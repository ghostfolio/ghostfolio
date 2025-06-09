import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { SearchMode } from '@ghostfolio/ui/assistant/enums/search-mode';
import {
  IAssetSearchResultItem,
  ISearchResultItem
} from '@ghostfolio/ui/assistant/interfaces/interfaces';

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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfSymbolModule, RouterModule],
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

  @Input() item: ISearchResultItem;

  @Output() clicked = new EventEmitter<void>();

  @ViewChild('link') public linkElement: ElementRef;

  public hasFocus = false;
  public queryParams: Params;
  public routerLink: string[];

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnChanges() {
    if (this.item?.mode === SearchMode.ASSET_PROFILE) {
      this.queryParams = {
        assetProfileDialog: true,
        dataSource: this.item?.dataSource,
        symbol: this.item?.symbol
      };
      this.routerLink = ['/admin', 'market-data'];
    } else if (this.item?.mode === SearchMode.HOLDING) {
      this.queryParams = {
        dataSource: this.item?.dataSource,
        holdingDetailDialog: true,
        symbol: this.item?.symbol
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

  public isAssetProfileOrHoldingItem(
    item: ISearchResultItem
  ): item is IAssetSearchResultItem {
    return (
      item.mode === SearchMode.ASSET_PROFILE || item.mode === SearchMode.HOLDING
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
