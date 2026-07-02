import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeviceDetectorService } from 'ngx-device-detector';

import { GfPageTabsComponent } from './page-tabs.component';

jest.mock('@ionic/angular/standalone', () => {
  const angularCore =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');

  class IonIconMockComponent {
    public readonly name = angularCore.input<string>();
    public readonly size = angularCore.input<string>();
  }

  angularCore.Component({
    selector: 'ion-icon',
    standalone: true,
    template: ''
  })(IonIconMockComponent);

  return { IonIcon: IonIconMockComponent };
});

describe('GfPageTabsComponent', () => {
  let fixture: ComponentFixture<GfPageTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GfPageTabsComponent],
      providers: [
        {
          provide: DeviceDetectorService,
          useValue: {
            getDeviceInfo: () => ({ deviceType: 'desktop' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfPageTabsComponent);
  });

  it('renders labels in a constrained Bootstrap truncation layout', async () => {
    fixture.componentRef.setInput('tabs', [
      {
        iconName: 'open-outline',
        label: 'A very long tab label that should be truncated',
        onClick: jest.fn()
      }
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const tabContent = nativeElement.querySelector<HTMLElement>(
      '.mdc-tab__text-label > .d-flex'
    );

    expect(tabContent).not.toBeNull();

    const tab = tabContent.closest<HTMLElement>('a, button');
    const icon = tabContent.querySelector<HTMLElement>('ion-icon');
    const label = tabContent.querySelector<HTMLElement>('.text-truncate');

    expect(tab).not.toBeNull();
    expect(icon).not.toBeNull();
    expect(label).not.toBeNull();

    expect(tab.classList).toContain('justify-content-start');
    expect(tab.classList).toContain('text-left');
    expect(tabContent.classList).toContain('justify-content-start');
    expect(tabContent.classList).toContain('text-left');
    expect(tabContent.classList).toContain('w-100');
    expect(icon.classList).toContain('flex-shrink-0');
    expect(label.classList).toContain('col');
    expect(label.classList).toContain('overflow-hidden');
    expect(label.classList).toContain('p-0');
    expect(label.textContent).toBe(
      'A very long tab label that should be truncated'
    );
  });
});
