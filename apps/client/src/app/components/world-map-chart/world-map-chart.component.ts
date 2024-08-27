import { getLocale, getNumberFormatGroup } from '@ghostfolio/common/helper';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit
} from '@angular/core';
import svgMap from 'svgmap';

@Component({
  selector: 'gf-world-map-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-map-chart.component.html',
  styleUrls: ['./world-map-chart.component.scss']
})
export class WorldMapChartComponent implements OnChanges, OnDestroy, OnInit {
  @Input() countries: { [code: string]: { name?: string; value: number } };
  @Input() format: string;
  @Input() isInPercent = false;
  @Input() locale = getLocale();

  public isLoading = true;
  public svgMapElement;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnInit() {}

  public ngOnChanges() {
    // Create a copy before manipulating countries object
    this.countries = structuredClone(this.countries);

    if (this.countries) {
      this.isLoading = true;

      this.destroySvgMap();

      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.destroySvgMap();
  }

  private initialize() {
    if (this.isInPercent) {
      // Convert value of countries to percentage
      let sum = 0;
      Object.keys(this.countries).map((country) => {
        sum += this.countries[country].value;
      });

      Object.keys(this.countries).map((country) => {
        this.countries[country].value = Number(
          ((this.countries[country].value * 100) / sum).toFixed(2)
        );
      });
    } else {
      // Convert value to fixed-point notation
      Object.keys(this.countries).map((country) => {
        this.countries[country].value = Number(
          this.countries[country].value.toFixed(2)
        );
      });
    }

    this.svgMapElement = new svgMap({
      colorMax: '#22bdb9',
      colorMin: '#c3f1f0',
      colorNoData: 'transparent',
      data: {
        applyData: 'value',
        data: {
          value: {
            format: this.format,
            thousandSeparator: getNumberFormatGroup(this.locale)
          }
        },
        values: this.countries
      },
      hideFlag: true,
      minZoom: 1.06,
      maxZoom: 1.06,
      targetElementID: 'svgMap'
    });

    setTimeout(() => {
      this.isLoading = false;

      this.changeDetectorRef.markForCheck();
    }, 500);
  }

  private destroySvgMap() {
    this.svgMapElement?.mapWrapper?.remove();
    this.svgMapElement?.tooltip?.remove();

    this.svgMapElement = null;
  }
}
