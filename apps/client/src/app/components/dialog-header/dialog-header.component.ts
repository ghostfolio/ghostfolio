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
  selector: 'gf-dialog-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog-header.component.html',
  styleUrls: ['./dialog-header.component.scss']
})
export class DialogHeaderComponent implements OnInit {
  @Input() deviceType: string;
  @Input() title: string;

  @Output() closeButtonClicked = new EventEmitter<void>();

  public constructor() {}

  public ngOnInit() {}

  public onClickCloseButton() {
    this.closeButtonClicked.emit();
  }
}
