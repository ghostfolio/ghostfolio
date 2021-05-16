import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { MarketState } from '@ghostfolio/api/services/interfaces/interfaces';
import { PortfolioPosition } from '@ghostfolio/common/interfaces/portfolio-position.interface';

@Component({
  selector: 'gf-positions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './positions.component.html',
  styleUrls: ['./positions.component.scss']
})
export class PositionsComponent implements OnChanges, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() locale: string;
  @Input() positions: { [symbol: string]: PortfolioPosition };
  @Input() range: string;

  public hasPositions: boolean;
  public positionsRest: PortfolioPosition[] = [];
  public positionsWithPriority: PortfolioPosition[] = [];

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.positions) {
      this.hasPositions = Object.entries(this.positions).length > 0;

      if (!this.hasPositions) {
        return;
      }

      this.positionsRest = [];
      this.positionsWithPriority = [];

      for (const [, portfolioPosition] of Object.entries(this.positions)) {
        if (
          portfolioPosition.marketState === MarketState.open ||
          this.range !== '1d'
        ) {
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
