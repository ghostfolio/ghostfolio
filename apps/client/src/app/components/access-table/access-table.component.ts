import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Access } from '@ghostfolio/api/app/access/interfaces/access.interface';

@Component({
  selector: 'gf-access-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './access-table.component.html',
  styleUrls: ['./access-table.component.scss']
})
export class AccessTableComponent implements OnChanges, OnInit {
  @Input() accesses: Access[];

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
