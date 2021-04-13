import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

@Component({
  host: { class: 'justify-content-center' },
  selector: 'gf-dialog-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog-footer.component.html',
  styleUrls: ['./dialog-footer.component.scss']
})
export class DialogFooterComponent implements OnInit {
  @Input() deviceType: string;

  @Output() closeButtonClicked = new EventEmitter<void>();

  public constructor() {}

  public ngOnInit() {}

  public onClickCloseButton() {
    this.closeButtonClicked.emit();
  }
}
