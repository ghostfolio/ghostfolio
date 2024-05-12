import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { ISearchResultItem } from '@ghostfolio/ui/assistant/interfaces/interfaces';

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
  standalone: true,
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
  @Input() mode: 'assetProfile' | 'holding';

  @Output() clicked = new EventEmitter<void>();

  @ViewChild('link') public linkElement: ElementRef;

  public hasFocus = false;
  public queryParams: Params;
  public routerLink: string[];

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnChanges() {
    const dataSource = this.item?.dataSource;
    const symbol = this.item?.symbol;

    if (this.mode === 'assetProfile') {
      this.queryParams = {
        dataSource,
        symbol,
        assetProfileDialog: true
      };
      this.routerLink = ['/admin', 'market-data'];
    } else if (this.mode === 'holding') {
      this.queryParams = {
        dataSource,
        symbol,
        holdingDetailDialog: true
      };
      this.routerLink = [];
    }
  }

  public focus() {
    this.hasFocus = true;

    this.changeDetectorRef.markForCheck();
  }

  public onClick() {
    this.clicked.emit();
  }

  public removeFocus() {
    this.hasFocus = false;

    this.changeDetectorRef.markForCheck();
  }
}
