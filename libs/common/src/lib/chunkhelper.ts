import { Prisma, PrismaClient } from '@prisma/client';

class Chunk<T> implements Iterable<T[] | undefined> {
  protected constructor(
    private readonly values: readonly T[],
    private readonly size: number
  ) {}

  *[Symbol.iterator]() {
    const copy = [...this.values];
    if (copy.length === 0) yield undefined;
    while (copy.length) yield copy.splice(0, this.size);
  }

  map<U>(mapper: (items?: T[]) => U): U[] {
    return Array.from(this).map((items) => mapper(items));
  }

  static of<U>(values: readonly U[]) {
    return {
      by: (size: number) => new Chunk(values, size)
    };
  }
}

export type Queryable<T, Result> = (
  p: PrismaClient,
  vs?: T[]
) => Prisma.PrismaPromise<Result>;
export class BatchPrismaClient {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly size = 32_000
  ) {}

  over<T>(values: readonly T[]) {
    return {
      with: <Result>(queryable: Queryable<T, Result>) =>
        this.prisma.$transaction(
          Chunk.of(values)
            .by(this.size)
            .map((vs) => queryable(this.prisma, vs))
        )
    };
  }
}
