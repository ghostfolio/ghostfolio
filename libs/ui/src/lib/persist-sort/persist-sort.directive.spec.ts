import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSort, MatSortModule } from '@angular/material/sort';

import { GfPersistSortDirective } from './persist-sort.directive';

@Component({
  imports: [GfPersistSortDirective, MatSortModule],
  template: `<table
    gfPersistSort="test"
    matSort
    matSortActive="name"
    matSortDirection="asc"
  ></table>`
})
class TestHostComponent {}

describe('GfPersistSortDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  const create = () => {
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    return fixture.debugElement.children[0].injector.get(MatSort);
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
  });

  it('keeps the default sorting without a stored value', () => {
    const sort = create();

    expect(sort.active).toBe('name');
    expect(sort.direction).toBe('asc');
  });

  it('stores the sorting on change', () => {
    const sort = create();

    sort.sort({ id: 'value', start: 'desc', disableClear: false });

    expect(JSON.parse(localStorage.getItem('gf-sort-test') ?? '{}')).toEqual({
      active: 'value',
      direction: 'desc'
    });
  });

  it('restores a stored sorting', () => {
    localStorage.setItem(
      'gf-sort-test',
      JSON.stringify({ active: 'value', direction: 'desc' })
    );

    const sort = create();

    expect(sort.active).toBe('value');
    expect(sort.direction).toBe('desc');
  });

  it('ignores an invalid stored sorting', () => {
    localStorage.setItem('gf-sort-test', '{"active":"value","direction":"x"}');

    const sort = create();

    expect(sort.active).toBe('name');
  });
});
