import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';

@Component({
  selector: 'gf-symbol-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './symbol-icon.component.html',
  styleUrls: ['./symbol-icon.component.scss']
})
export class SymbolIconComponent implements OnInit {
  @Input() size: 'large';
  @Input() tooltip: string;
  @Input() url: string;

  public constructor() {}

  public ngOnInit() {}
}
