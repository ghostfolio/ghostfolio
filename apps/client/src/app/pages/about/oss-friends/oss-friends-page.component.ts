import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline } from 'ionicons/icons';

const ossFriends = require('../../../../assets/oss-friends.json');

@Component({
  imports: [IonIcon, MatButtonModule, MatCardModule],
  selector: 'gf-oss-friends-page',
  styleUrls: ['./oss-friends-page.scss'],
  templateUrl: './oss-friends-page.html'
})
export class GfOpenSourceSoftwareFriendsPageComponent {
  public ossFriends = ossFriends.data;

  public constructor() {
    addIcons({ arrowForwardOutline });
  }
}
