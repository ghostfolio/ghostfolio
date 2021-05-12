import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { AuthDeviceDto } from '@ghostfolio/api/app/auth-device/auth-device.dto';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'gf-auth-device-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-device-settings.component.html',
  styleUrls: ['./auth-device-settings.component.css']
})
export class AuthDeviceSettingsComponent implements OnInit, OnChanges {

  @Input() authDevices: AuthDeviceDto[];

  @Output() authDeviceDeleted = new EventEmitter<string>();
  @Output() authDeviceToUpdate = new EventEmitter<AuthDeviceDto>();

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  public dataSource: MatTableDataSource<AuthDeviceDto> = new MatTableDataSource();
  public displayedColumns = [];
  public isLoading = true;
  public pageSize = 7;

  constructor() { }

  ngOnInit(): void {
  }

  public ngOnChanges() {
    this.displayedColumns = [
      'name',
      'createdAt',
      'actions',
    ];

    this.isLoading = true;

    if (this.authDevices) {
      this.dataSource = new MatTableDataSource(this.authDevices);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.isLoading = false;
    }
  }

  public onDeleteAuthDevice(aId: string) {
    const confirmation = confirm('Do you really want to remove this authenticator?');

    if (confirmation) {
      this.authDeviceDeleted.emit(aId);
    }
  }
}
