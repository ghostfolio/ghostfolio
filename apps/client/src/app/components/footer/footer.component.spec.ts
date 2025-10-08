import { GfFooterComponent } from './footer.component';

// TODO: Fix Jest configuration for Ionic components
describe.skip('GfFooterComponent', () => {
  let component: GfFooterComponent;

  beforeEach(() => {
    component = new GfFooterComponent();
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

  it('should initialize permission properties', () => {
    component.ngOnChanges();

    expect(component.hasPermissionForStatistics).toBeDefined();
    expect(component.hasPermissionForSubscription).toBeDefined();
    expect(component.hasPermissionToAccessFearAndGreedIndex).toBeDefined();
  });
});
