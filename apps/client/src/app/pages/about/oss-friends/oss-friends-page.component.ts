import { Component, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';

const ossFriends = require('../../../../assets/oss-friends.json');

@Component({
  imports: [IonIcon, MatButtonModule, MatCardModule],
  selector: 'gf-oss-friends-page',
  styleUrls: ['./oss-friends-page.scss'],
  templateUrl: './oss-friends-page.html'
})
export class OpenSourceSoftwareFriendsPageComponent implements OnDestroy {
  public ossFriends = ossFriends.data;

  private unsubscribeSubject = new Subject<void>();

  public constructor() {
    addIcons({ arrowForwardOutline });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
