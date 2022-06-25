import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-auth-page',
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.scss']
})
export class AuthPageComponent implements OnDestroy, OnInit {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private tokenStorageService: TokenStorageService
  ) {}

  public ngOnInit() {
    this.route.params
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        const jwt = params['jwt'];
        this.tokenStorageService.saveToken(
          jwt,
          this.settingsStorageService.getSetting(STAY_SIGNED_IN) === 'true'
        );

        this.router.navigate(['/']);
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
