import { Injectable } from '@angular/core';
import * as deDateFnsLocale from 'date-fns/locale/de/index';
import * as frDateFnsLocale from 'date-fns/locale/fr/index';
import { BehaviorSubject } from 'rxjs';

// TODO: Rename to language service

/**
 * Service that distributes onLanguageChanged events
 */
@Injectable()
export class LanguageManager {
  private static readonly AVALABLE_LANGUAGES = ['de', 'fr'];
  private static readonly LANGUAGE_LABELS = {
    de: 'Deutsch',
    fr: 'Français'
  };
  private currentLanguage: string;
  private changeLoadLanguageStateSubject = new BehaviorSubject(false);

  /**
   * @constructor
   */
  public constructor() {} // private translate: TranslateService // private dataLoaderManager: DataLoaderManager,

  /**
   * Emits an event that the language has changed
   */
  public changeLanguage(aLanguage: string) {
    if (aLanguage && aLanguage !== this.currentLanguage) {
      this.currentLanguage = aLanguage;

      this.changeLoadLanguageStateSubject.next(true);

      // this.translate.use(this.currentLanguage);

      /*this.dataLoaderManager.changeLanguage(this.currentLanguage).then(() => {
        // Emit an event that loading has finished
        this.changeLoadLanguageStateSubject.next(false);
      });*/
    }
  }

  /**
   * Returns a list of available languages for admin
   */
  public getAvailableLanguages() {
    return LanguageManager.AVALABLE_LANGUAGES;
  }

  /**
   * Get the current language
   */
  public getCurrentLanguage(aReturnFullLocale = false) {
    // Check if the full locale is needed (e.g. for angular pipes like
    // '| percentage')
    if (aReturnFullLocale) {
      if (this.currentLanguage) {
        if (this.currentLanguage.match(/^de/)) {
          return 'de-CH';
        }

        if (this.currentLanguage.match(/^fr/)) {
          return 'fr-CH';
        }
      }

      // Default
      return 'de-CH';
    }

    if (this.currentLanguage) {
      return this.currentLanguage;
    }

    // Default
    return 'de';
  }

  /**
   * Gets the locale module of date-fns in the current language
   */
  public getDateFnsLocale() {
    let currentDateFnsLocale = null;

    switch (this.getCurrentLanguage()) {
      case 'de':
        currentDateFnsLocale = deDateFnsLocale;
        break;
      case 'fr':
        currentDateFnsLocale = frDateFnsLocale;
        break;
      default:
        currentDateFnsLocale = deDateFnsLocale;
    }

    return currentDateFnsLocale;
  }

  /**
   * Returns the default language
   */
  public getDefaultLanguage() {
    // return globals.defaultLanguage;
    return 'de';
  }

  /**
   * Returns a pretty label of the given language
   */
  public getLanguageLabel(aLanguage: string) {
    if (LanguageManager.LANGUAGE_LABELS[aLanguage]) {
      return LanguageManager.LANGUAGE_LABELS[aLanguage];
    }

    return aLanguage;
  }

  /**
   * Returns an observable that emits true when loading is in progress and false
   * when loading is finished
   */
  public onChangeLoadLanguageState() {
    return this.changeLoadLanguageStateSubject.asObservable();
  }
}
