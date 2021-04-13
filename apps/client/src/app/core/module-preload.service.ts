import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable()
export class ModulePreloadService implements PreloadingStrategy {
  /**
   * Preloads all lazy loading modules with the attribute 'preload' set to true
   */
  preload(route: Route, load: Function): Observable<any> {
    return route.data?.preload ? load() : of(null);
  }
}
