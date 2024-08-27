import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-logo',
  standalone: true,
  styleUrls: ['./logo.component.scss'],
  templateUrl: './logo.component.html'
})
export class GfLogoComponent {
  @HostBinding('class') @Input() size: 'large' | 'medium' = 'medium';
  @Input() label: string;
  @Input() showLabel = true;

  public constructor() {}
}
