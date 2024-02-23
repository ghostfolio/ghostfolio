import { DataService } from '@ghostfolio/client/services/data.service';

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'gf-base-product-page',
  template: ''
})
export class BaseProductPageComponent implements OnInit {
  public price: number;

  public constructor(private dataService: DataService) {}

  public ngOnInit() {
    const { subscriptions } = this.dataService.fetchInfo();

    this.price = subscriptions?.default?.price;
  }
}
