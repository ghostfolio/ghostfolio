import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';

@Component({
  selector: 'gf-auth-page',
  templateUrl: './auth-page.html',
  styleUrls: ['./auth-page.scss']
})
export class AuthPageComponent implements OnInit {
  /**
   * @constructor
   */
  public constructor(
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private tokenStorageService: TokenStorageService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.route.params.subscribe((params) => {
      const jwt = params['jwt'];
      this.tokenStorageService.saveToken(
        jwt,
        this.settingsStorageService.getSetting(STAY_SIGNED_IN) === 'true'
      );

      this.router.navigate(['/']);
    });
  }
}
