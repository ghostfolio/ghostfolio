import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TokenStorageService } from '../../services/token-storage.service';

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
    private tokenStorageService: TokenStorageService
  ) {}

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.route.params.subscribe((params) => {
      const jwt = params['jwt'];
      this.tokenStorageService.saveToken(jwt);

      this.router.navigate(['/']);
    });
  }
}
