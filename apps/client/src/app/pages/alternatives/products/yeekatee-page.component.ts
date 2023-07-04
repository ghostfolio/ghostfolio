import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Comparison } from '@ghostfolio/common/interfaces';

import { data } from '../data';

@Component({
  host: { class: 'page' },
  imports: [CommonModule, MatButtonModule, RouterModule],
  selector: 'gf-yeekatee-page',
  standalone: true,
  templateUrl: '../page-template.html'
})
export class YeekateePageComponent {
  public product1: Comparison = data.find(({ key }) => {
    return key === 'ghostfolio';
  });

  public product2: Comparison = data.find(({ key }) => {
    return key === 'yeekatee';
  });
}
