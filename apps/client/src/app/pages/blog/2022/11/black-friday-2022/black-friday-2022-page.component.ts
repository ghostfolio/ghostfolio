import { Component } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';

@Component({
  host: { class: 'page' },
  selector: 'gf-black-friday-2022-page',
  styleUrls: ['./black-friday-2022-page.scss'],
  templateUrl: './black-friday-2022-page.html'
})
export class BlackFriday2022PageComponent {
  public discount: number;

  public constructor(private dataService: DataService) {
    const { subscriptions } = this.dataService.fetchInfo();

    const coupon = subscriptions?.[0]?.coupon ?? 0;
    const price = subscriptions?.[0]?.price ?? 1;

    this.discount = Math.floor((coupon / price) * 100) / 100;
  }
}
