import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit
} from '@angular/core';
import { primaryColorHex } from '@ghostfolio/common/config';
import { getCssVariable, getTextColor } from '@ghostfolio/common/helper';
import { Currency } from '@prisma/client';
import svgMap from 'svgmap';

@Component({
  selector: 'gf-world-map-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './world-map-chart.component.html',
  styleUrls: ['./world-map-chart.component.scss']
})
export class WorldMapChartComponent implements OnChanges, OnDestroy, OnInit {
  @Input() baseCurrency: Currency;
  @Input() countries: { [code: string]: { name: string; value: number } };

  public isLoading = true;
  public svgMapElement;

  public constructor(private changeDetectorRef: ChangeDetectorRef) {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.countries) {
      this.destroySvgMap();

      this.initialize();
    }
  }

  public ngOnDestroy() {
    this.destroySvgMap();
  }

  private initialize() {
    this.svgMapElement = new svgMap({
      colorMax: primaryColorHex,
      colorMin: '#d3f4f3',
      colorNoData: `rgba(${getTextColor()}, ${getCssVariable(
        '--palette-foreground-divider-alpha'
      )})`,
      data: {
        applyData: 'value',
        data: {
          value: {
            format: `{0} ${this.baseCurrency}`
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
