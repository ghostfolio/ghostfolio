import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
  OnInit
} from '@angular/core';

@Component({
  selector: 'gf-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent implements OnInit {
  @HostBinding('class') @Input() size: 'large' | 'medium';

  public constructor() {}

  public ngOnInit() {
    this.size = this.size || 'medium';
  }
}
