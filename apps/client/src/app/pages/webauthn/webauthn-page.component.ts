import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';

@Component({
  selector: 'gf-webauthn-page',
  templateUrl: './webauthn-page.html',
  styleUrls: ['./webauthn-page.scss']
})
export class WebauthnPageComponent implements OnInit {
  public hasError = false;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private webAuthnService: WebAuthnService
  ) {}

  public ngOnInit() {
    this.signIn();
  }

  public deregisterDevice() {
    this.webAuthnService.deregister().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  public signIn() {
    this.hasError = false;

    this.webAuthnService.login().subscribe(
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
