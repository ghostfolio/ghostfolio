import { DataService } from '@ghostfolio/ui/services';

import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

(global as any).$localize = (
  messageParts: TemplateStringsArray,
  ...expressions: any[]
) => {
  return String.raw({ raw: messageParts }, ...expressions);
};

jest.mock('@angular/localize', () => {
  return {};
});

jest.mock('@ghostfolio/client/services/user/user.service', () => {
  return {
    UserService: class UserService {}
  };
});

jest.mock('@ghostfolio/ui/value', () => {
  const { Component, Input } = require('@angular/core');

  @Component({
    selector: 'gf-value',
    template: '{{ value }}'
  })
  class GfValueComponent {
    @Input() public isCurrency = false;
    @Input() public locale: string;
    @Input() public unit: string;
    @Input() public value: number;
  }

  return { GfValueComponent };
});

const {
  UserService
} = require('@ghostfolio/client/services/user/user.service');
const { GfBudgetPageComponent } = require('./budget-page.component');

describe('GfBudgetPageComponent', () => {
  let dataService: jest.Mocked<
    Pick<DataService, 'deleteBudget' | 'fetchBudgets'>
  >;
  let dialog: jest.Mocked<Pick<MatDialog, 'open'>>;
  let fixture: ComponentFixture<GfBudgetPageComponent>;

  beforeEach(async () => {
    dataService = {
      deleteBudget: jest.fn().mockReturnValue(of(undefined)),
      fetchBudgets: jest.fn().mockReturnValue(
        of({
          budgets: [
            {
              amount: 500,
              category: {
                id: 'food',
                name: 'Food'
              },
              categoryId: 'food',
              createdAt: new Date('2026-06-01'),
              currency: 'USD',
              id: 'budget-1',
              month: '2026-06',
              remaining: 125,
              spent: 375,
              updatedAt: new Date('2026-06-01')
            }
          ],
          totalBudgeted: 500,
          totalRemaining: 125,
          totalSpent: 375
        })
      )
    };
    dialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of({ refresh: true })
      })
    };

    await TestBed.configureTestingModule({
      imports: [GfBudgetPageComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        {
          provide: DataService,
          useValue: dataService
        },
        {
          provide: MatDialog,
          useValue: dialog
        },
        {
          provide: UserService,
          useValue: {
            stateChanged: of({
              user: {
                permissions: [],
                settings: {
                  baseCurrency: 'USD',
                  locale: 'en-US'
                }
              }
            })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfBudgetPageComponent);
    fixture.autoDetectChanges();
  });

  it('loads and renders budgets for the selected month', async () => {
    await fixture.whenStable();

    expect(dataService.fetchBudgets).toHaveBeenCalledWith({
      month: expect.stringMatching(/^\d{4}-\d{2}$/)
    });
    expect(fixture.nativeElement.textContent).toContain('Budget');
    expect(fixture.nativeElement.textContent).toContain('Food');
  });

  it('reloads budgets after creating a budget', async () => {
    await fixture.whenStable();

    fixture.componentInstance.onCreateBudget();
    await fixture.whenStable();

    expect(dialog.open).toHaveBeenCalled();
    expect(dataService.fetchBudgets).toHaveBeenCalledTimes(2);
  });

  it('deletes a budget and reloads the month', async () => {
    await fixture.whenStable();

    fixture.componentInstance.onDeleteBudget('budget-1');
    await fixture.whenStable();

    expect(dataService.deleteBudget).toHaveBeenCalledWith('budget-1');
    expect(dataService.fetchBudgets).toHaveBeenCalledTimes(2);
  });
});
