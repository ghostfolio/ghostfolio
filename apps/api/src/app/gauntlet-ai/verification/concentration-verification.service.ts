import { Injectable } from '@nestjs/common';

interface AllocationItem {
  key: string;
  percentage: number;
}

export interface ConcentrationVerificationResult {
  confidence: 'high' | 'low' | 'medium';
  needsHumanReview: boolean;
  warnings: string[];
}

@Injectable()
export class ConcentrationVerificationService {
  private readonly assetThreshold = 0.25;
  private readonly sectorThreshold = 0.4;

  public verify({
    assets,
    sectors
  }: {
    assets: AllocationItem[];
    sectors: AllocationItem[];
  }): ConcentrationVerificationResult {
    const warnings: string[] = [];

    for (const asset of assets) {
      if (asset.percentage > this.assetThreshold) {
        warnings.push(
          `Asset concentration warning: ${asset.key} is ${(asset.percentage * 100).toFixed(2)}% (threshold ${(this.assetThreshold * 100).toFixed(0)}%).`
        );
      }
    }

    for (const sector of sectors) {
      if (sector.percentage > this.sectorThreshold) {
        warnings.push(
          `Sector concentration warning: ${sector.key} is ${(sector.percentage * 100).toFixed(2)}% (threshold ${(this.sectorThreshold * 100).toFixed(0)}%).`
        );
      }
    }

    if (warnings.length >= 3) {
      return { confidence: 'low', needsHumanReview: true, warnings };
    }

    if (warnings.length > 0) {
      return { confidence: 'medium', needsHumanReview: false, warnings };
    }

    return { confidence: 'high', needsHumanReview: false, warnings: [] };
  }
}
