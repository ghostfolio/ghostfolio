import { getLocale } from '@ghostfolio/common/helper';
import { Position } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';

@Component({
  selector: 'gf-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './positions.component.html',
  styleUrls: ['./positions.component.scss']
})
export class PositionsComponent implements OnChanges, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() hasPermissionToCreateOrder: boolean;
  @Input() locale = getLocale();
  @Input() positions: Position[];
  @Input() range: string;

  public hasPositions: boolean;
  public positionsRest: Position[] = [];
  public positionsWithPriority: Position[] = [];

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.positions) {
      this.hasPositions = this.positions.length > 0;

      if (!this.hasPositions) {
        return;
      }

      this.positionsRest = [];
      this.positionsWithPriority = [];

      for (const portfolioPosition of this.positions) {
        if (portfolioPosition.marketState === 'open' || this.range !== '1d') {
          // Only show positions where the market is open in today's view
          this.positionsWithPriority.push(portfolioPosition);
        } else {
          this.positionsRest.push(portfolioPosition);
        }
      }

      this.positionsRest.sort((a, b) =>
        (a.name || a.symbol)?.toLowerCase() >
        (b.name || b.symbol)?.toLowerCase()
          ? 1
          : -1
      );
      this.positionsWithPriority.sort((a, b) =>
        (a.name || a.symbol)?.toLowerCase() >
        (b.name || b.symbol)?.toLowerCase()
          ? 1
          : -1
      );
    } else {
      this.hasPositions = false;
    }
  }
}
