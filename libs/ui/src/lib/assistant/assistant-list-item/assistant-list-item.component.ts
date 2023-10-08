import { FocusableOption } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { Position } from '@ghostfolio/common/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-assistant-list-item',
  templateUrl: './assistant-list-item.html',
  styleUrls: ['./assistant-list-item.scss']
})
export class AssistantListItemComponent implements FocusableOption {
  @HostBinding('attr.tabindex') tabindex = -1;
  @HostBinding('class.has-focus') get getHasFocus() {
    return this.hasFocus;
  }

  @Input() holding: Position;

  @Output() clicked = new EventEmitter<void>();

  @ViewChild('link') public linkElement: ElementRef;

  public hasFocus = false;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

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
