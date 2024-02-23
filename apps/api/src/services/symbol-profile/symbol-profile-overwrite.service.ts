import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable } from '@nestjs/common';
import { DataSource, Prisma, SymbolProfileOverrides } from '@prisma/client';

@Injectable()
export class SymbolProfileOverwriteService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async add(
    assetProfileOverwrite: Prisma.SymbolProfileOverridesCreateInput
  ): Promise<SymbolProfileOverrides | never> {
    return this.prismaService.symbolProfileOverrides.create({
      data: assetProfileOverwrite
    });
  }

  public async delete(symbolProfileId: string) {
    return this.prismaService.symbolProfileOverrides.delete({
      where: { symbolProfileId: symbolProfileId }
    });
  }

  public updateSymbolProfileOverrides({
    assetClass,
    assetSubClass,
    name,
    countries,
    sectors,
    url,
    symbolProfileId
  }: Prisma.SymbolProfileOverridesUpdateInput & { symbolProfileId: string }) {
    return this.prismaService.symbolProfileOverrides.update({
      data: {
        assetClass,
        assetSubClass,
        name,
        countries,
        sectors,
        url
      },
      where: { symbolProfileId: symbolProfileId }
    });
  }

  public async GetSymbolProfileId(
    Symbol: string,
    datasource: DataSource
  ): Promise<string> {
    let SymbolProfileId = await this.prismaService.symbolProfile
      .findFirst({
        where: {
          symbol: Symbol,
          dataSource: datasource
        }
      })
      .then((s) => s.id);

    let symbolProfileIdSaved = await this.prismaService.symbolProfileOverrides
      .findFirst({
        where: {
          symbolProfileId: SymbolProfileId
        }
      })
      .then((s) => s?.symbolProfileId);

    return symbolProfileIdSaved;
  }
}
