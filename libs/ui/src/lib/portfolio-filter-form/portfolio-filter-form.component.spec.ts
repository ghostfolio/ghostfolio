import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { GfPortfolioFilterFormComponent } from './portfolio-filter-form.component';

// Mock $localize for testing
(global as any).$localize = (template: any) => {
  return template.raw ? template.raw.join('') : template;
};

describe('GfPortfolioFilterFormComponent', () => {
  let component: GfPortfolioFilterFormComponent;
  let fixture: ComponentFixture<GfPortfolioFilterFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GfPortfolioFilterFormComponent,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        NoopAnimationsModule,
        ReactiveFormsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfPortfolioFilterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form values', () => {
    expect(component.filterForm.value).toEqual({
      account: null,
      assetClass: null,
      holding: null,
      tag: null
    });
  });

  it('should detect when filters are applied', () => {
    component.filterForm.patchValue({ account: 'test-account-id' });
    expect(component.hasFilters()).toBeTruthy();
  });

  it('should detect when no filters are applied', () => {
    expect(component.hasFilters()).toBeFalsy();
  });

  it('should emit resetFilters event when onResetFilters is called', () => {
    jest.spyOn(component.resetFilters, 'emit');
    component.onResetFilters();
    expect(component.resetFilters.emit).toHaveBeenCalled();
  });

  it('should emit applyFilters event when onApplyFilters is called', () => {
    jest.spyOn(component.applyFilters, 'emit');
    component.onApplyFilters();
    expect(component.applyFilters.emit).toHaveBeenCalled();
  });
});
