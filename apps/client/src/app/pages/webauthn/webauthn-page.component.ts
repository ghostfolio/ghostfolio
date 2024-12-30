import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { GfLogoComponent } from '@ghostfolio/ui/logo';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  imports: [GfLogoComponent, MatButtonModule, MatProgressSpinnerModule],
  selector: 'gf-webauthn-page',
  styleUrls: ['./webauthn-page.scss'],
  templateUrl: './webauthn-page.html'
})
export class GfWebauthnPageComponent implements OnDestroy, OnInit {
  public hasError = false;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private webAuthnService: WebAuthnService
  ) {}

  public ngOnInit() {
    this.signIn();
  }

  public deregisterDevice() {
    this.webAuthnService
      .deregister()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.router.navigate(['/']);
      });
  }

  public signIn() {
    this.hasError = false;

    this.webAuthnService
      .login()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({ authToken }) => {
          this.tokenStorageService.saveToken(authToken, false);
          this.router.navigate(['/']);
        },
        (error) => {
          console.error(error);
          this.hasError = true;
          this.changeDetectorRef.markForCheck();
        }
      );
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
