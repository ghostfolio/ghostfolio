import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit
} from '@angular/core';

@Component({
  selector: 'gf-trend-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trend-indicator.component.html',
  styleUrls: ['./trend-indicator.component.scss']
})
export class TrendIndicatorComponent implements OnInit {
  @Input() isLoading: boolean;
  @Input() isPaused: boolean;
  @Input() range: string;
  @Input() value: number;

  public constructor() {}

  public ngOnInit() {}
}
