import '@angular/localize/init';

import { GfAnalysisPageComponent } from './analysis-page.component';

jest.mock('@ionic/angular/standalone', () => {
  const { Component } =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');

  class IonIconMock {}

  Component({
    inputs: ['name'],
    selector: 'ion-icon',
    standalone: true,
    template: ''
  })(IonIconMock);

  return { IonIcon: IonIconMock };
});

jest.mock('ionicons', () => {
  return { addIcons: () => undefined };
});

jest.mock('ionicons/icons', () => {
  return {
    copyOutline: '',
    diamondOutline: '',
    ellipsisVertical: '',
    sparklesOutline: ''
  };
});

jest.mock('./ai-chat.component', () => {
  const { Component } =
    jest.requireActual<typeof import('@angular/core')>('@angular/core');

  class GfAiChatComponentMock {}

  Component({
    selector: 'gf-ai-chat',
    standalone: true,
    template: ''
  })(GfAiChatComponentMock);

  return { GfAiChatComponent: GfAiChatComponentMock };
});

describe('GfAnalysisPageComponent AI chat eligibility', () => {
  const canUseAiChat = (
    eligibility: {
      hasGlobalPermission?: boolean;
      hasImpersonationId?: boolean;
      hasUserPermission?: boolean;
      isExperimentalFeatures?: boolean;
      model?: string;
    } = {}
  ) => {
    const {
      hasGlobalPermission = true,
      hasImpersonationId = false,
      hasUserPermission = true,
      isExperimentalFeatures = true
    } = eligibility;
    const model = Object.hasOwn(eligibility, 'model')
      ? eligibility.model
      : 'openai/test-model';

    const component = Object.create(
      GfAnalysisPageComponent.prototype
    ) as unknown as {
      aiChatModel?: string;
      canUseAiChat: boolean;
      hasImpersonationId: boolean;
      hasPermissionToAccessAiChat: boolean;
      hasPermissionToUseAiChat: boolean;
      user: { settings: { isExperimentalFeatures: boolean } };
    };

    component.aiChatModel = model;
    component.hasImpersonationId = hasImpersonationId;
    component.hasPermissionToAccessAiChat = hasUserPermission;
    component.hasPermissionToUseAiChat = hasGlobalPermission;
    component.user = { settings: { isExperimentalFeatures } };

    return component.canUseAiChat;
  };

  it('allows a fully eligible user', () => {
    expect(canUseAiChat({})).toBe(true);
  });

  it.each([
    { model: undefined },
    { hasGlobalPermission: false },
    { hasUserPermission: false },
    { isExperimentalFeatures: false },
    { hasImpersonationId: true }
  ])('blocks an ineligible context (%o)', (eligibility) => {
    expect(canUseAiChat(eligibility)).toBe(false);
  });
});
