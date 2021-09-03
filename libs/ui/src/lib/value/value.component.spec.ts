import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValueComponent } from './value.component';

describe('ValueComponent', () => {
  let component: ValueComponent;
  let fixture: ComponentFixture<ValueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValueComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
