import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { products } from '../products';

@Component({
  host: { class: 'page' },
  imports: [CommonModule, MatButtonModule, RouterModule],
  selector: 'gf-utluna-page',
  standalone: true,
  styleUrls: ['../page-template.scss'],
  templateUrl: '../page-template.html'
})
export class UtlunaPageComponent {
  public product1 = products.find(({ key }) => {
    return key === 'ghostfolio';
  });

  public product2 = products.find(({ key }) => {
    return key === 'utluna';
  });
}
