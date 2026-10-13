import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL,
  PROPERTY_OPENROUTER_MODEL_AGENT,
  PROPERTY_OPENROUTER_MODEL_VISION
} from '@ghostfolio/common/config';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService, DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import '@angular/localize/init';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { GfAdminSettingsComponent } from './admin-settings.component';

jest.mock(
  '@ghostfolio/client/components/admin-platform/admin-platform.component',
  () => ({
    GfAdminPlatformComponent: class {}
  })
);
jest.mock(
  '@ghostfolio/client/components/admin-tag/admin-tag.component',
  () => ({
    GfAdminTagComponent: class {}
  })
);
jest.mock(
  '@ghostfolio/client/components/data-provider-status/data-provider-status.component',
  () => ({
    GfDataProviderStatusComponent: class {}
  })
);
jest.mock('@ghostfolio/ui/entity-logo', () => ({
  GfEntityLogoComponent: class {}
}));
jest.mock('@ghostfolio/ui/premium-indicator', () => ({
  GfPremiumIndicatorComponent: class {}
}));
jest.mock('@ghostfolio/ui/value', () => ({ GfValueComponent: class {} }));
jest.mock('@ghostfolio/client/services/user/user.service', () => ({
  UserService: class {}
}));
jest.mock('@ghostfolio/ui/notifications', () => ({
  NotificationService: class {}
}));
jest.mock('@ghostfolio/ui/services', () => ({
  AdminService: class {},
  DataService: class {}
}));
jest.mock('@ghostfolio/common/helper', () => ({
  getDateFormatString: () => 'yyyy-MM-dd'
}));
jest.mock('@ionic/angular/standalone', () => ({ IonIcon: class {} }));

describe('GfAdminSettingsComponent OpenRouter settings', () => {
  let component: GfAdminSettingsComponent;
  let element: HTMLElement;
  let fixture: ComponentFixture<GfAdminSettingsComponent>;
  let settings: Record<string, string>;
  let adminService: { fetchAdminData: jest.Mock };
  let dataService: { putAdminSetting: jest.Mock };
  let notificationService: {
    confirm: jest.Mock<void, [{ confirmFn: () => void }]>;
  };

  beforeEach(async () => {
    settings = {
      [PROPERTY_API_KEY_OPENROUTER]: 'stored-secret',
      [PROPERTY_OPENROUTER_MODEL]: 'provider/default-model',
      [PROPERTY_OPENROUTER_MODEL_AGENT]: 'provider/agent-model'
    };
    adminService = {
      fetchAdminData: jest
        .fn()
        .mockImplementation(() => of({ dataProviders: [], settings }))
    };
    dataService = { putAdminSetting: jest.fn().mockReturnValue(of({})) };
    notificationService = {
      confirm: jest.fn<void, [{ confirmFn: () => void }]>()
    };

    await TestBed.configureTestingModule({
      errorOnUnknownProperties: true,
      imports: [GfAdminSettingsComponent],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: DataService, useValue: dataService },
        { provide: NotificationService, useValue: notificationService },
        { provide: UserService, useValue: { stateChanged: of(null) } }
      ]
    })
      .overrideComponent(GfAdminSettingsComponent, {
        set: {
          imports: [
            CommonModule,
            ReactiveFormsModule,
            MatButtonModule,
            MatCardModule,
            MatFormFieldModule,
            MatInputModule,
            MatMenuModule,
            MatProgressBarModule,
            MatSortModule,
            MatTableModule,
            MatTooltipModule,
            RouterModule
          ],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
          styleUrls: [],
          styles: []
        }
      })
      .compileComponents();
  });

  async function createComponent() {
    fixture = TestBed.createComponent(GfAdminSettingsComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  function getApiKeyInput(): HTMLInputElement {
    const input = element.querySelector<HTMLInputElement>(
      'input[formControlName="apiKey"]'
    );
    if (!input) {
      throw new Error('Missing OpenRouter API key input');
    }
    return input;
  }

  it('loads saved model identifiers without placing the stored secret in the form', async () => {
    await createComponent();

    expect(component.hasOpenRouterApiKey).toBe(true);
    expect(component.openRouterForm.getRawValue()).toEqual({
      apiKey: '',
      model: 'provider/default-model',
      agentModel: 'provider/agent-model',
      visionModel: ''
    });
    expect(element.textContent).not.toContain('stored-secret');
  });

  it('renders a password input and accessible labels for all four settings', async () => {
    await createComponent();

    const keyInput = getApiKeyInput();
    expect(keyInput.type).toBe('password');
    expect(keyInput.value).toBe('');
    expect(keyInput.autocomplete).toBe('new-password');
    expect(keyInput.labels?.[0].textContent).toContain('OpenRouter API key');

    const labels: HTMLLabelElement[] = Array.from(
      element.querySelectorAll<HTMLLabelElement>('label[for]')
    );
    for (const text of [
      'Default model',
      'Asset and account matching model',
      'File reading model'
    ]) {
      const label = labels.find(({ textContent }) =>
        textContent.includes(text)
      );
      expect(label).toBeDefined();
      expect(element.querySelector(`#${label?.htmlFor}`)).toBeTruthy();
    }
    for (const label of [
      'Save default model',
      'Save asset and account matching model',
      'Save file reading model'
    ]) {
      expect(
        element.querySelector(`button[aria-label="${label}"]`)
      ).toBeTruthy();
    }
  });

  it('saves a trimmed replacement key and clears only the key input after success', async () => {
    await createComponent();
    const keyInput = getApiKeyInput();
    keyInput.value = '  replacement-secret  ';
    keyInput.dispatchEvent(new Event('input'));
    component.openRouterForm.controls.visionModel.setValue(
      'unsaved/vision-model'
    );
    await fixture.whenStable();

    const buttons: HTMLButtonElement[] = Array.from(
      element.querySelectorAll<HTMLButtonElement>('button')
    );
    buttons
      .find(({ textContent }) => textContent.includes('Replace API key'))
      ?.click();
    await fixture.whenStable();

    expect(dataService.putAdminSetting).toHaveBeenCalledWith(
      PROPERTY_API_KEY_OPENROUTER,
      { value: 'replacement-secret' }
    );
    expect(component.openRouterForm.controls.apiKey.value).toBe('');
    expect(component.openRouterForm.controls.visionModel.value).toBe(
      'unsaved/vision-model'
    );
    expect(component.hasOpenRouterApiKey).toBe(true);
    expect(component.openRouterFeedback?.isError).toBe(false);
  });

  it.each([
    ['model', PROPERTY_OPENROUTER_MODEL],
    ['agentModel', PROPERTY_OPENROUTER_MODEL_AGENT],
    ['visionModel', PROPERTY_OPENROUTER_MODEL_VISION]
  ] as const)(
    'saves a trimmed %s identifier to its own setting',
    async (controlName, property) => {
      await createComponent();
      component.openRouterForm.controls[controlName].setValue(
        '  provider/new-model  '
      );

      component.onSaveOpenRouterModel(controlName);
      await fixture.whenStable();

      expect(dataService.putAdminSetting).toHaveBeenCalledTimes(1);
      expect(dataService.putAdminSetting).toHaveBeenCalledWith(property, {
        value: 'provider/new-model'
      });
      expect(component.openRouterForm.controls[controlName].value).toBe(
        'provider/new-model'
      );
      expect(component.canSaveOpenRouterModel(controlName)).toBe(false);
    }
  );

  it('clears an existing optional override so the default model can be used', async () => {
    await createComponent();
    component.openRouterForm.controls.agentModel.setValue('   ');

    component.onSaveOpenRouterModel('agentModel');
    component.onSaveOpenRouterModel('agentModel');
    await fixture.whenStable();

    expect(dataService.putAdminSetting).toHaveBeenCalledTimes(1);
    expect(dataService.putAdminSetting).toHaveBeenCalledWith(
      PROPERTY_OPENROUTER_MODEL_AGENT,
      { value: undefined }
    );
    expect(component.openRouterForm.controls.model.value).toBe(
      'provider/default-model'
    );
  });

  it('does not send a delete for an optional override that was never configured', async () => {
    await createComponent();
    component.openRouterForm.controls.visionModel.setValue('   ');

    component.onSaveOpenRouterModel('visionModel');

    expect(dataService.putAdminSetting).not.toHaveBeenCalled();
  });

  it('keeps the existing key when the replacement input is blank', async () => {
    await createComponent();
    component.openRouterForm.controls.apiKey.setValue('   ');

    component.onSaveOpenRouterApiKey();

    expect(dataService.putAdminSetting).not.toHaveBeenCalled();
    expect(component.hasOpenRouterApiKey).toBe(true);
  });

  it('rejects a blank default model and ignores an unchanged model', async () => {
    await createComponent();
    component.openRouterForm.controls.model.setValue('   ');
    component.onSaveOpenRouterModel('model');
    expect(component.openRouterForm.controls.model.hasError('required')).toBe(
      true
    );

    component.openRouterForm.controls.model.setValue(
      ' provider/default-model '
    );
    component.onSaveOpenRouterModel('model');

    expect(dataService.putAdminSetting).not.toHaveBeenCalled();
  });

  it('removes the API key only after the removal is confirmed', async () => {
    await createComponent();

    component.onRemoveOpenRouterApiKey();

    expect(dataService.putAdminSetting).not.toHaveBeenCalled();
    expect(notificationService.confirm).toHaveBeenCalledTimes(1);
    notificationService.confirm.mock.calls[0][0].confirmFn();
    await fixture.whenStable();

    expect(dataService.putAdminSetting).toHaveBeenCalledWith(
      PROPERTY_API_KEY_OPENROUTER,
      { value: undefined }
    );
    expect(component.hasOpenRouterApiKey).toBe(false);
    expect(component.openRouterFeedback?.isError).toBe(false);
  });

  it('preserves failed model edits and allows retry without reporting success', async () => {
    await createComponent();
    dataService.putAdminSetting.mockReturnValueOnce(
      throwError(() => new Error('Save failed'))
    );
    component.openRouterForm.controls.model.setValue(
      '  provider/retry-model  '
    );

    component.onSaveOpenRouterModel('model');
    await fixture.whenStable();

    expect(component.openRouterForm.controls.model.value).toBe(
      '  provider/retry-model  '
    );
    expect(component.isSavingOpenRouterSetting).toBe(false);
    expect(component.openRouterForm.enabled).toBe(true);
    expect(component.canSaveOpenRouterModel('model')).toBe(true);
    expect(component.openRouterFeedback?.isError).toBe(true);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Could not save'
    );

    component.onSaveOpenRouterModel('model');
    await fixture.whenStable();

    expect(dataService.putAdminSetting).toHaveBeenCalledTimes(2);
    expect(component.openRouterFeedback?.isError).toBe(false);
  });

  it('retains a replacement key and configured status when its save fails', async () => {
    await createComponent();
    dataService.putAdminSetting.mockReturnValueOnce(
      throwError(() => new Error('Save failed'))
    );
    component.openRouterForm.controls.apiKey.setValue('  retry-secret  ');

    component.onSaveOpenRouterApiKey();
    await fixture.whenStable();

    expect(component.openRouterForm.controls.apiKey.value).toBe(
      '  retry-secret  '
    );
    expect(component.hasOpenRouterApiKey).toBe(true);
    expect(component.isSavingOpenRouterSetting).toBe(false);
    expect(component.openRouterFeedback?.isError).toBe(true);
  });

  it('keeps the configured key when confirmed removal fails', async () => {
    await createComponent();
    dataService.putAdminSetting.mockReturnValueOnce(
      throwError(() => new Error('Delete failed'))
    );

    component.onRemoveOpenRouterApiKey();
    notificationService.confirm.mock.calls[0][0].confirmFn();
    await fixture.whenStable();

    expect(component.hasOpenRouterApiKey).toBe(true);
    expect(component.isSavingOpenRouterSetting).toBe(false);
    expect(component.openRouterFeedback?.isError).toBe(true);
  });

  it('disables editing and blocks additional requests while a save is pending', async () => {
    await createComponent();
    const pendingSave = new Subject();
    dataService.putAdminSetting.mockReturnValue(pendingSave);
    component.openRouterForm.controls.apiKey.setValue('new-secret');
    component.openRouterForm.controls.model.setValue('provider/new-model');

    component.onSaveOpenRouterApiKey();
    component.onSaveOpenRouterApiKey();
    component.onSaveOpenRouterModel('model');
    component.onRemoveOpenRouterApiKey();
    await fixture.whenStable();

    expect(component.openRouterForm.disabled).toBe(true);
    expect(dataService.putAdminSetting).toHaveBeenCalledTimes(1);
    expect(notificationService.confirm).not.toHaveBeenCalled();
    const inputs: HTMLInputElement[] = Array.from(
      element.querySelectorAll<HTMLInputElement>('input')
    );
    expect(inputs).toHaveLength(4);
    expect(inputs.every(({ disabled }) => disabled)).toBe(true);

    pendingSave.next({});
    pendingSave.complete();
    await fixture.whenStable();

    expect(component.isSavingOpenRouterSetting).toBe(false);
    expect(component.openRouterForm.enabled).toBe(true);
  });

  it('blocks mutations until the existing settings finish loading', async () => {
    const pendingLoad = new Subject();
    adminService.fetchAdminData.mockReturnValue(pendingLoad);
    await createComponent();
    component.openRouterForm.controls.apiKey.setValue('new-secret');
    component.openRouterForm.controls.model.setValue('provider/new-model');

    component.onSaveOpenRouterApiKey();
    component.onSaveOpenRouterModel('model');
    component.onRemoveOpenRouterApiKey();

    expect(component.isLoading).toBe(true);
    expect(component.openRouterForm.disabled).toBe(true);
    expect(dataService.putAdminSetting).not.toHaveBeenCalled();
    expect(notificationService.confirm).not.toHaveBeenCalled();

    pendingLoad.next({ dataProviders: [], settings });
    pendingLoad.complete();
    await fixture.whenStable();

    expect(component.isLoading).toBe(false);
    expect(component.isOpenRouterSettingsLoaded).toBe(true);
    expect(component.openRouterForm.enabled).toBe(true);
  });

  it('shows a load error and leaves mutations disabled when settings cannot be read', async () => {
    adminService.fetchAdminData.mockReturnValue(
      throwError(() => new Error('Load failed'))
    );
    await createComponent();
    component.openRouterForm.controls.apiKey.setValue('new-secret');
    component.openRouterForm.controls.model.setValue('provider/new-model');

    component.onSaveOpenRouterApiKey();
    component.onSaveOpenRouterModel('model');
    component.onRemoveOpenRouterApiKey();

    expect(component.isLoading).toBe(false);
    expect(component.isOpenRouterSettingsLoaded).toBe(false);
    expect(component.openRouterForm.disabled).toBe(true);
    expect(dataService.putAdminSetting).not.toHaveBeenCalled();
    expect(notificationService.confirm).not.toHaveBeenCalled();
    expect(element.textContent).toContain(
      'Could not load Ghostfolio AI settings'
    );
    expect(element.textContent).not.toContain('No API key is configured');
  });
});
