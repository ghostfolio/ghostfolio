import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import '@angular/localize/init';

import { IRoute } from './interfaces/interfaces';

export const internalRoutes: Record<string, IRoute> = {
  account: {
    path: 'account',
    routerLink: ['/account'],
    subRoutes: {
      access: {
        path: 'access',
        routerLink: ['/account', 'access'],
        title: $localize`Access`
      },
      membership: {
        path: 'membership',
        routerLink: ['/account', 'membership'],
        title: $localize`Membership`
      }
    },
    title: $localize`Settings`
  },
  adminControl: {
    excludeFromAssistant: (aUser: User) => {
      return hasPermission(aUser?.permissions, permissions.accessAdminControl);
    },
    path: 'admin',
    routerLink: ['/admin'],
    subRoutes: {
      jobs: {
        path: 'jobs',
        routerLink: ['/admin', 'jobs'],
        title: $localize`Job Queue`
      },
      marketData: {
        path: 'market-data',
        routerLink: ['/admin', 'market-data'],
        title: $localize`Market Data`
      },
      settings: {
        path: 'settings',
        routerLink: ['/admin', 'settings'],
        title: $localize`Settings`
      },
      users: {
        path: 'users',
        routerLink: ['/admin', 'users'],
        title: $localize`Users`
      }
    },
    title: $localize`Admin Control`
  },
  accounts: {
    path: 'accounts',
    routerLink: ['/accounts'],
    title: $localize`Accounts`
  },
  api: {
    excludeFromAssistant: true,
    path: 'api',
    routerLink: ['/api'],
    title: 'Ghostfolio API'
  },
  auth: {
    excludeFromAssistant: true,
    path: 'auth',
    routerLink: ['/auth'],
    title: $localize`Sign in`
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
      markets: {
        path: 'markets',
        routerLink: ['/home', 'markets'],
        title: $localize`Markets`
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
  i18n: {
    excludeFromAssistant: true,
    path: 'i18n',
    routerLink: ['/i18n'],
    title: $localize`Internationalization`
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
  webauthn: {
    excludeFromAssistant: true,
    path: 'webauthn',
    routerLink: ['/webauthn'],
    title: $localize`Sign in`
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
      changelog: {
        path: $localize`:kebab-case:changelog`,
        routerLink: [
          '/' + $localize`:kebab-case:about`,
          $localize`:kebab-case:changelog`
        ],
        title: $localize`Changelog`
      },
      license: {
        path: $localize`:kebab-case:license`,
        routerLink: [
          '/' + $localize`:kebab-case:about`,
          $localize`:kebab-case:license`
        ],
        title: $localize`License`
      },
      ossFriends: {
        path: 'oss-friends',
        routerLink: ['/' + $localize`:kebab-case:about`, 'oss-friends'],
        title: 'OSS Friends'
      },
      privacyPolicy: {
        path: $localize`:kebab-case:privacy-policy`,
        routerLink: [
          '/' + $localize`:kebab-case:about`,
          $localize`:kebab-case:privacy-policy`
        ],
        title: $localize`Privacy Policy`
      },
      termsOfService: {
        path: $localize`:kebab-case:terms-of-service`,
        routerLink: [
          '/' + $localize`:kebab-case:about`,
          $localize`:kebab-case:terms-of-service`
        ],
        title: $localize`Terms of Service`
      }
    },
    title: $localize`About`
  },
  blog: {
    path: 'blog',
    routerLink: ['/blog'],
    title: $localize`Blog`
  },
  demo: {
    path: 'demo',
    routerLink: ['/demo'],
    title: $localize`Live Demo`
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
  public: {
    path: 'p',
    routerLink: ['/p']
  },
  register: {
    path: $localize`:kebab-case:register`,
    routerLink: ['/' + $localize`:kebab-case:register`],
    title: $localize`Registration`
  },
  resources: {
    path: $localize`:kebab-case@@routes.resources:resources`,
    routerLink: ['/' + $localize`:kebab-case@@routes.resources:resources`],
    subRoutes: {
      glossary: {
        path: $localize`:kebab-case:glossary`,
        routerLink: [
          '/' + $localize`:kebab-case@@routes.resources:resources`,
          $localize`:kebab-case:glossary`
        ],
        title: $localize`Glossary`
      },
      guides: {
        path: $localize`:kebab-case:guides`,
        routerLink: [
          '/' + $localize`:kebab-case@@routes.resources:resources`,
          $localize`:kebab-case:guides`
        ],
        title: $localize`Guides`
      },
      markets: {
        path: $localize`:kebab-case:markets`,
        routerLink: [
          '/' + $localize`:kebab-case@@routes.resources:resources`,
          $localize`:kebab-case:markets`
        ],
        title: $localize`Markets`
      },
      personalFinanceTools: {
        path: $localize`:kebab-case@@routes.resources.personalFinanceTools:personal-finance-tools`,
        routerLink: [
          '/' + $localize`:kebab-case@@routes.resources:resources`,
          $localize`:kebab-case@@routes.resources.personalFinanceTools:personal-finance-tools`
        ],
        subRoutes: {
          product: {
            path: $localize`:kebab-case@@routes.resources.personalFinanceTools.openSourceAlternativeTo:open-source-alternative-to`,
            title: $localize`Open Source Alternative to`
          }
        },
        title: $localize`Personal Finance Tools`
      }
    },
    title: $localize`Resources`
  },
  start: {
    path: 'start',
    routerLink: ['/start']
  }
};
