import '@angular/localize/init';

export const routes = {
  access: 'access',
  account: 'account',
  activities: 'activities',
  adminControl: 'admin',
  allocations: 'allocations',
  api: 'api',
  auth: 'auth',
  demo: 'demo',
  fire: 'fire',
  holdings: 'holdings',
  i18n: 'i18n',
  jobs: 'jobs',
  market: 'market',
  marketData: 'market-data',
  membership: 'membership',
  personalFinanceTools: 'personal-finance-tools',
  public: 'p',
  saas: 'saas',
  settings: 'settings',
  start: 'start',
  summary: 'summary',
  users: 'users',
  watchlist: 'watchlist',
  webauthn: 'webauthn',
  xRay: 'x-ray',

  // Publicly accessible pages
  about: $localize`:kebab-case:about`,
  blog: 'blog',
  changelog: $localize`:kebab-case:changelog`,
  faq: $localize`:kebab-case:faq`,
  features: $localize`:kebab-case:features`,
  glossary: $localize`:kebab-case:glossary`,
  guides: $localize`:kebab-case:guides`,
  license: $localize`:kebab-case:license`,
  markets: $localize`:kebab-case:markets`,
  openSourceAlternativeTo: $localize`:kebab-case:open-source-alternative-to`,
  ossFriends: 'oss-friends',
  pricing: $localize`:kebab-case:pricing`,
  privacyPolicy: $localize`:kebab-case:privacy-policy`,
  resources: $localize`:kebab-case:resources`,
  selfHosting: $localize`:kebab-case:self-hosting`,
  termsOfService: $localize`:kebab-case:terms-of-service`
};

export const internalRoutes = {
  accounts: {
    path: 'accounts',
    subRoutes: {},
    title: $localize`Accounts`
  },
  home: {
    excludeFromAssistant: true,
    path: 'home',
    subRoutes: {},
    title: $localize`Overview`
  },
  portfolio: {
    path: 'portfolio',
    subRoutes: {},
    title: $localize`Portfolio`
  },
  zen: {
    excludeFromAssistant: true,
    path: 'zen',
    subRoutes: {},
    title: $localize`Overview`
  }
};

export const publicRoutes = {
  openStartup: {
    path: 'open',
    title: 'Open Startup'
  },
  register: {
    path: $localize`:kebab-case:register`,
    title: $localize`Registration`
  }
};
