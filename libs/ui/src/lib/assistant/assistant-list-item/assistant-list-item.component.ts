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
import { Params } from '@angular/router';
import { Position } from '@ghostfolio/common/interfaces';
import { SymbolProfile } from '@prisma/client';

import { ISearchResultItem } from '../interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-assistant-list-item',
  templateUrl: './assistant-list-item.html',
  styleUrls: ['./assistant-list-item.scss']
})
export class AssistantListItemComponent implements FocusableOption, OnChanges {
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
    if (this.mode === 'assetProfile') {
      this.queryParams = {
        assetProfileDialog: true,
        dataSource: this.item?.dataSource,
        symbol: this.item?.symbol
      };
      this.routerLink = ['/admin', 'market-data'];
    } else if (this.mode === 'holding') {
      this.queryParams = {
        dataSource: this.item?.dataSource,
        positionDetailDialog: true,
        symbol: this.item?.symbol
      };
      this.routerLink = ['/portfolio', 'holdings'];
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
