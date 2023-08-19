import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  host: { class: 'page' },
  selector: 'gf-oss-friends-page',
  styleUrls: ['./oss-friends-page.scss'],
  templateUrl: './oss-friends-page.html'
})
export class OpenSourceSoftwareFriendsPageComponent implements OnDestroy {
  public ossFriends = [
    {
      description: 'Build custom software on top of your data.',
      name: 'Appsmith',
      url: 'https://www.appsmith.com'
    },
    {
      description:
        'BoxyHQ’s suite of APIs for security and privacy helps engineering teams build and ship compliant cloud applications faster.',
      name: 'BoxyHQ',
      url: 'https://boxyhq.com'
    },
    {
      description:
        'Cal.com is a scheduling tool that helps you schedule meetings without the back-and-forth emails.',
      name: 'Cal.com',
      url: 'https://cal.com'
    },
    {
      description:
        'Centralize community, product, and customer data to understand which companies are engaging with your open source project.',
      name: 'Crowd.dev',
      url: 'https://www.crowd.dev'
    },
    {
      description:
        'The Open-Source DocuSign Alternative. We aim to earn your trust by enabling you to self-host the platform and examine its inner workings.',
      name: 'Documenso',
      url: 'https://documenso.com'
    },
    {
      description:
        'The Open-Source HubSpot Alternative. A single XOS enables to create unique and life-changing experiences ​​that work for all types of business.',
      name: 'Erxes',
      url: 'https://erxes.io'
    },
    {
      description:
        'Survey granular user segments at any point in the user journey. Gather up to 6x more insights with targeted micro-surveys. All open-source.',
      name: 'Formbricks',
      url: 'https://formbricks.com'
    },
    {
      description:
        'GitWonk is an open-source technical documentation tool, designed and built focusing on the developer experience.',
      name: 'GitWonk',
      url: 'https://gitwonk.com'
    },
    {
      description:
        'Open-source authentication and user management for the passkey era. Integrated in minutes, for web and mobile apps.',
      name: 'Hanko',
      url: 'https://www.hanko.io'
    },
    {
      description:
        'HTMX is a dependency-free JavaScript library that allows you to access AJAX, CSS Transitions, WebSockets, and Server Sent Events directly in HTML.',
      name: 'HTMX',
      url: 'https://htmx.org'
    },
    {
      description:
        'Open source, end-to-end encrypted platform that lets you securely manage secrets and configs across your team, devices, and infrastructure.',
      name: 'Infisical',
      url: 'https://infisical.com'
    },
    {
      description:
        'Mockoon is the easiest and quickest way to design and run mock REST APIs.',
      name: 'Mockoon',
      url: 'https://mockoon.com'
    },
    {
      description:
        'The open-source notification infrastructure for developers. Simple components and APIs for managing all communication channels in one place.',
      name: 'Novu',
      url: 'https://novu.co'
    },
    {
      description:
        'Democratizing investment research through an open source financial ecosystem. The OpenBB Terminal allows everyone to perform investment research, from everywhere.',
      name: 'OpenBB',
      url: 'https://openbb.co'
    },
    {
      description:
        'Sniffnet is a network monitoring tool to help you easily keep track of your Internet traffic.',
      name: 'Sniffnet',
      url: 'https://www.sniffnet.net'
    },
    {
      description: 'Software localization from A to Z made really easy.',
      name: 'Tolgee',
      url: 'https://tolgee.io'
    },
    {
      description:
        'Create long-running Jobs directly in your codebase with features like API integrations, webhooks, scheduling and delays.',
      name: 'Trigger.dev',
      url: 'https://trigger.dev'
    },
    {
      description:
        'Typebot gives you powerful blocks to create unique chat experiences. Embed them anywhere on your apps and start collecting results like magic.',
      name: 'Typebot',
      url: 'https://typebot.io'
    },
    {
      description:
        'A modern CRM offering the flexibility of open-source, advanced features and sleek design.',
      name: 'Twenty',
      url: 'https://twenty.com'
    },
    {
      description:
        'Open-source enterprise-grade serverless CMS. Own your data. Scale effortlessly. Customize everything.',
      name: 'Webiny',
      url: 'https://www.webiny.com'
    },
    {
      description: 'Webstudio is an open source alternative to Webflow',
      name: 'Webstudio',
      url: 'https://webstudio.is'
    }
  ];

  private unsubscribeSubject = new Subject<void>();

  public constructor() {}

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
