import {
  KEY_STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';

import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'gf-auth-page',
  styleUrls: ['./auth-page.scss'],
  templateUrl: './auth-page.html'
})
export class GfAuthPageComponent implements OnInit {
  public constructor(
    private destroyRef: DestroyRef,
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private tokenStorageService: TokenStorageService
  ) {}

  public ngOnInit() {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const jwt = params['jwt'];

        this.tokenStorageService.saveToken(
          jwt,
          this.settingsStorageService.getSetting(KEY_STAY_SIGNED_IN) === 'true'
        );

        this.router.navigate(['/']);
      });
  }
}
