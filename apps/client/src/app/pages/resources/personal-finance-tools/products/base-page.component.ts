import { Component, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';

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
