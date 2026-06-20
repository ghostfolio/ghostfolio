import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { GfLogoComponent } from '@ghostfolio/ui/logo';

import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

@Component({
  host: { class: 'page' },
  imports: [GfLogoComponent, MatButtonModule, MatProgressSpinnerModule],
  selector: 'gf-webauthn-page',
  styleUrls: ['./webauthn-page.scss'],
  templateUrl: './webauthn-page.html'
})
export class GfWebauthnPageComponent implements OnInit {
  public hasError = false;

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private destroyRef: DestroyRef,
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.router.navigate(['/']);
      });
  }

  public signIn() {
    this.hasError = false;

    this.webAuthnService
      .login()
      .pipe(takeUntilDestroyed(this.destroyRef))
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
}
