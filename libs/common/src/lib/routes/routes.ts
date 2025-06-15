import '@angular/localize/init';

import { IRoute } from './interfaces/interfaces';

export const routes = {
  access: 'access',
  adminControl: 'admin',
  api: 'api',
  auth: 'auth',
  demo: 'demo',
  i18n: 'i18n',
  jobs: 'jobs',
  market: 'market',
  marketData: 'market-data',
  membership: 'membership',
  personalFinanceTools: 'personal-finance-tools',
  public: 'p',
  settings: 'settings',
  start: 'start',
  users: 'users',
  webauthn: 'webauthn',

  // Publicly accessible pages
  about: $localize`:kebab-case:about`,
  changelog: $localize`:kebab-case:changelog`,
  glossary: $localize`:kebab-case:glossary`,
  guides: $localize`:kebab-case:guides`,
  license: $localize`:kebab-case:license`,
  markets: $localize`:kebab-case:markets`,
  openSourceAlternativeTo: $localize`:kebab-case:open-source-alternative-to`,
  privacyPolicy: $localize`:kebab-case:privacy-policy`,
  resources: $localize`:kebab-case:resources`,
  termsOfService: $localize`:kebab-case:terms-of-service`
};

export const internalRoutes: Record<string, IRoute> = {
  account: {
    path: 'account',
    routerLink: ['/account'],
    title: $localize`Settings`
  },
  accounts: {
    path: 'accounts',
    routerLink: ['/accounts'],
    title: $localize`Accounts`
  },
  home: {
    path: 'home',
    routerLink: ['/home'],
    subRoutes: {
      holdings: {
        path: 'holdings',
        routerLink: ['/home', 'holdings'],
        title: $localize`Holdings`
      },
      summary: {
        path: 'summary',
        routerLink: ['/home', 'summary'],
        title: $localize`Summary`
      },
      watchlist: {
        path: 'watchlist',
        routerLink: ['/home', 'watchlist'],
        title: $localize`Watchlist`
      }
    },
    title: $localize`Overview`
  },
  portfolio: {
    path: 'portfolio',
    routerLink: ['/portfolio'],
    subRoutes: {
      activities: {
        path: 'activities',
        routerLink: ['/portfolio', 'activities'],
        title: $localize`Activities`
      },
      allocations: {
        path: 'allocations',
        routerLink: ['/portfolio', 'allocations'],
        title: $localize`Allocations`
      },
      analysis: {
        path: undefined, // Default sub route
        routerLink: ['/portfolio'],
        title: $localize`Analysis`
      },
      fire: {
        path: 'fire',
        routerLink: ['/portfolio', 'fire'],
        title: 'FIRE'
      },
      xRay: {
        path: 'x-ray',
        routerLink: ['/portfolio', 'x-ray'],
        title: 'X-ray'
      }
    },
    title: $localize`Portfolio`
  },
  zen: {
    excludeFromAssistant: true,
    path: 'zen',
    routerLink: ['/zen'],
    subRoutes: {
      holdings: {
        path: 'holdings',
        routerLink: ['/zen', 'holdings'],
        title: $localize`Holdings`
      }
    },
    title: $localize`Overview`
  }
};

export const publicRoutes = {
  about: {
    path: $localize`:kebab-case:about`,
    routerLink: ['/' + $localize`:kebab-case:about`],
    subRoutes: {
      ossFriends: {
        path: 'oss-friends',
        routerLink: ['/' + $localize`:kebab-case:about`, 'oss-friends'],
        title: 'OSS Friends'
      }
    },
    title: $localize`About`
  },
  blog: {
    path: 'blog',
    routerLink: ['/blog'],
    title: $localize`Blog`
  },
  faq: {
    path: $localize`:kebab-case:faq`,
    routerLink: ['/' + $localize`:kebab-case:faq`],
    subRoutes: {
      saas: {
        path: 'saas',
        routerLink: ['/' + $localize`:kebab-case:faq`, 'saas'],
        title: $localize`Cloud` + ' (SaaS)'
      },
      selfHosting: {
        path: $localize`:kebab-case:self-hosting`,
        routerLink: [
          '/' + $localize`:kebab-case:faq`,
          $localize`:kebab-case:self-hosting`
        ],
        title: $localize`Self-Hosting`
      }
    },
    title: $localize`Frequently Asked Questions (FAQ)`
  },
  features: {
    path: $localize`:kebab-case:features`,
    routerLink: ['/' + $localize`:kebab-case:features`],
    title: $localize`Features`
  },
  markets: {
    path: $localize`:kebab-case:markets`,
    routerLink: ['/' + $localize`:kebab-case:markets`],
    title: $localize`Markets`
  },
  openStartup: {
    path: 'open',
    routerLink: ['/open'],
    title: 'Open Startup'
  },
  pricing: {
    path: $localize`:kebab-case:pricing`,
    routerLink: ['/' + $localize`:kebab-case:pricing`],
    title: $localize`Pricing`
  },
  register: {
    path: $localize`:kebab-case:register`,
    routerLink: ['/' + $localize`:kebab-case:register`],
    title: $localize`Registration`
  }
};
