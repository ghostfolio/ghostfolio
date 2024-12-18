import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { getDateFnsLocale, getLocale } from '@ghostfolio/common/helper';
import { PortfolioSummary, User } from '@ghostfolio/common/interfaces';
import { translate } from '@ghostfolio/ui/i18n';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { formatDistanceToNow } from 'date-fns';

@Component({
  selector: 'gf-portfolio-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-summary.component.html',
  styleUrls: ['./portfolio-summary.component.scss']
})
export class PortfolioSummaryComponent implements OnChanges {
  @Input() baseCurrency: string;
  @Input() hasPermissionToUpdateUserSettings: boolean;
  @Input() isLoading: boolean;
  @Input() language: string;
  @Input() locale = getLocale();
  @Input() summary: PortfolioSummary;
  @Input() user: User;

  @Output() emergencyFundChanged = new EventEmitter<number>();

  public buyAndSellActivitiesTooltip = translate(
    'BUY_AND_SELL_ACTIVITIES_TOOLTIP'
  );
  public timeInMarket: string;

  public constructor(private notificationService: NotificationService) {}

  public ngOnChanges() {
    if (this.summary) {
      if (this.summary.firstOrderDate) {
        this.timeInMarket = formatDistanceToNow(this.summary.firstOrderDate, {
          locale: getDateFnsLocale(this.language)
        });
      } else {
        this.timeInMarket = '-';
      }
    } else {
      this.timeInMarket = undefined;
    }
  }

  public onEditEmergencyFund() {
    this.notificationService.prompt({
      confirmFn: (value) => {
        // If empty/deleted value by user, default to 0.
        const emergencyFund = parseFloat(value.trim()) || 0;
        if (emergencyFund >= 0) {
          this.emergencyFundChanged.emit(emergencyFund);
        }
      },
      confirmLabel: $localize`Save`,
      defaultValue: this.summary.emergencyFund?.total?.toString() ?? '0',
      title: $localize`Please enter the amount of your emergency fund:`,
      valueLabel: $localize`Emergency fund`
    });
  }
}
