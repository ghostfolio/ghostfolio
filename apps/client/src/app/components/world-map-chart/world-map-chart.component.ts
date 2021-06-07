import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit
} from '@angular/core';
import { primaryColorHex } from '@ghostfolio/common/config';

import svgMap from 'svgmap';

@Component({
  selector: 'gf-world-map-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-map-chart.component.html',
  styleUrls: ['./world-map-chart.component.scss']
})
export class WorldMapChartComponent implements OnChanges, OnDestroy, OnInit {
  @Input() countries: { [code: string]: { name: string; value: number } };

  public isLoading = true;

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.countries) {
      this.initialize();
    }
  }

  public ngOnDestroy() {}

  private initialize() {
    new svgMap({
      colorMax: primaryColorHex,
      colorMin: '#d3f4f3',
      colorNoData: '#eeeeee',
      data: {
        applyData: 'value',
        data: {
          value: {
            format: '{0}',
            name: 'Value'
          }
        },
        values: this.countries
      },
      hideFlag: true,
      minZoom: 1.06,
      maxZoom: 1.06,
      targetElementID: 'svgMap'
    });

    this.isLoading = false;
  }
}
