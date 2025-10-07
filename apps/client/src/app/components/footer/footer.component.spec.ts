import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { GfFooterComponent } from './footer.component';

describe('GfFooterComponent', () => {
  let component: GfFooterComponent;
  let fixture: ComponentFixture<GfFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GfFooterComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GfFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have current year property', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('should have router links defined', () => {
    expect(component.routerLinkAbout).toBeDefined();
    expect(component.routerLinkFeatures).toBeDefined();
    expect(component.routerLinkResources).toBeDefined();
  });
});
