import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private static readonly DEFAULT_TITLE =
    'Ghostfolio – Open Source Wealth Management Software';
  private static readonly DEFAULT_TITLE_SHORT = 'Ghostfolio';

  public constructor(private readonly title: Title) {
    super();
  }

  public override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);

    if (title) {
      this.title.setTitle(
        `${title} – ${PageTitleStrategy.DEFAULT_TITLE_SHORT}`
      );
    } else {
      this.title.setTitle(`${PageTitleStrategy.DEFAULT_TITLE}`);
    }
  }
}
