import { DestroyRef, Directive, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSort, SortDirection } from '@angular/material/sort';

const STORAGE_KEY_PREFIX = 'gf-sort-';

/**
 * Remembers the sorting of a `matSort` table on the device and restores it
 * on the next visit.
 */
@Directive({
  selector: '[gfPersistSort]'
})
export class GfPersistSortDirective implements OnInit {
  public readonly gfPersistSort = input.required<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly matSort = inject(MatSort, { self: true });

  public ngOnInit() {
    const storageKey = `${STORAGE_KEY_PREFIX}${this.gfPersistSort()}`;
    const storedSort = this.readStoredSort(storageKey);

    if (storedSort) {
      this.matSort.active = storedSort.active;
      this.matSort.direction = storedSort.direction;
    }

    this.matSort.sortChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ active, direction }) => {
        try {
          globalThis.localStorage?.setItem(
            storageKey,
            JSON.stringify({ active, direction })
          );
        } catch {}
      });
  }

  private readStoredSort(aStorageKey: string) {
    try {
      const item = globalThis.localStorage?.getItem(aStorageKey);
      const { active, direction } = JSON.parse(item ?? 'null') ?? {};

      if (
        typeof active === 'string' &&
        active.length > 0 &&
        (direction === 'asc' || direction === 'desc')
      ) {
        return { active, direction: direction as SortDirection };
      }
    } catch {}

    return undefined;
  }
}
