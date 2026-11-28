import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GfTargetPercentPipe } from './target-percent.pipe';

describe('Target percentage locale', () => {
  let pipe: GfTargetPercentPipe;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: LOCALE_ID, useValue: 'en' }]
    });
    pipe = TestBed.runInInjectionContext(() => new GfTargetPercentPipe());
  });
  afterEach(() => TestBed.resetTestingModule());

  it('honors an Italian number locale on an English interface', () => {
    expect(pipe.transform(0.1234, 'it-IT')).toBe('12,34%');
    expect(pipe.transform(0.1234, 'en-US')).toBe('12.34%');
  });

  it('uses the interface locale when no number preference exists', () => {
    expect(pipe.transform(0.1234)).toBe('12.34%');
  });

  it('formats signed drift and tolerance without changing their values', () => {
    expect(pipe.transform(-0.105, 'it-IT', 2, true)).toBe('-10,5%');
    expect(pipe.transform(0, 'it-IT', 2, true)).toBe('+0%');
    expect(pipe.transform(0.055, 'it-IT', 1)).toBe('5,5%');
  });
  it('falls back to the interface locale for a malformed stored preference', () => {
    expect(pipe.transform(0.1234, 'not_a_locale')).toBe('12.34%');
  });
});
