import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Access } from '@ghostfolio/common/interfaces';

@Component({
  selector: 'gf-access-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-table.component.html',
  styleUrls: ['./access-table.component.scss']
})
export class AccessTableComponent implements OnChanges, OnInit {
  @Input() accesses: Access[];

  public baseUrl = window.location.origin;
  public dataSource: MatTableDataSource<Access>;
  public displayedColumns = ['granteeAlias', 'type'];

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.accesses) {
      this.dataSource = new MatTableDataSource(this.accesses);
    }
  }
}
