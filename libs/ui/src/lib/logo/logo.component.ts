import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input
} from '@angular/core';

@Component({
  selector: 'gf-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
  @HostBinding('class') @Input() size: 'large' | 'medium' = 'medium';
  @Input() color: string;
  @Input() label: string;
  @Input() showLabel = true;

  public constructor() {}
}
