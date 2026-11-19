import { PortfolioTargetProfile, User } from '@ghostfolio/common/interfaces';
import { TARGET_ASSET_CLASSES } from '@ghostfolio/common/portfolio-targets/portfolio-targets-calculator';
import { isValidPortfolioTargetsSettings } from '@ghostfolio/common/portfolio-targets/portfolio-targets-validation';
import { AssetClass } from '@ghostfolio/prisma/enums';
import { translate } from '@ghostfolio/ui/i18n';
import { GfPortfolioProportionChartComponent } from '@ghostfolio/ui/portfolio-proportion-chart';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { GfTargetPercentPipe } from './target-percent.pipe';
import { createTargetFromPreset, TARGET_PRESETS } from './target-presets';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfTargetPercentPipe,
    FormsModule,
    GfPortfolioProportionChartComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  selector: 'gf-target-configuration-dialog',
  styleUrls: ['./target-configuration-dialog.component.scss'],
  templateUrl: './target-configuration-dialog.component.html'
})
export class GfTargetConfigurationDialogComponent {
  protected readonly classes = TARGET_ASSET_CLASSES;
  protected readonly presets = TARGET_PRESETS;
  protected profile: PortfolioTargetProfile;

  protected readonly data = inject<{
    profile?: PortfolioTargetProfile;
    user: User;
  }>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<
      MatDialogRef<GfTargetConfigurationDialogComponent, PortfolioTargetProfile>
    >(MatDialogRef);

  protected readonly labels = Object.fromEntries(
    TARGET_ASSET_CLASSES.map((assetClass) => [
      assetClass,
      translate(assetClass)
    ])
  ) as Record<AssetClass, string>;

  public constructor() {
    const defaultProfile = createTargetFromPreset('moderate-60-40');
    this.profile = {
      ...(this.data.profile ?? defaultProfile),
      allocations: {
        ...(this.data.profile?.allocations ?? defaultProfile.allocations)
      }
    };
    this.updateChartData();
  }

  protected chartData: Record<string, { name: string; value: number }> = {};

  private updateChartData() {
    this.chartData = Object.fromEntries(
      this.classes.map((assetClass) => [
        assetClass,
        {
          name: this.labels[assetClass],
          value: Math.max(0, this.profile.allocations[assetClass] ?? 0)
        }
      ])
    );
  }

  protected get total() {
    return this.classes.reduce(
      (sum, assetClass) => sum + (this.profile.allocations[assetClass] ?? 0),
      0
    );
  }

  protected get isValid() {
    return isValidPortfolioTargetsSettings({
      version: 1,
      activeProfileId: 'global',
      profiles: [{ ...this.profile, id: 'global' }]
    });
  }

  protected applyPreset(presetId: string) {
    const next = createTargetFromPreset(presetId);
    this.profile = {
      ...next,
      tolerance: this.profile.tolerance
    };
    this.updateChartData();
  }

  protected updateAllocation(assetClass: AssetClass, percent: number) {
    this.profile = {
      ...this.profile,
      presetId: undefined,
      name: 'Custom',
      allocations: {
        ...this.profile.allocations,
        [assetClass]: percent == null ? NaN : Number(percent) / 100
      }
    };
    this.updateChartData();
  }

  protected updateTolerance(percent: number) {
    this.profile = {
      ...this.profile,
      tolerance: percent == null ? NaN : Number(percent) / 100
    };
  }

  protected save() {
    if (this.isValid) {
      this.dialogRef.close(this.profile);
    }
  }

  protected cancel() {
    this.dialogRef.close();
  }
}
