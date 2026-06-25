import {
  CreateBudgetDto,
  CreateExpenseCategoryDto,
  UpdateBudgetDto,
  UpdateExpenseCategoryDto
} from '@ghostfolio/common/dtos';

import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DataService } from './data.service';

describe('DataService budget methods', () => {
  let dataService: DataService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });

    dataService = TestBed.inject(DataService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('fetches budgets for a month', () => {
    dataService.fetchBudgets({ month: '2026-06' }).subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/budgets?month=2026-06'
    );

    expect(request.request.method).toBe('GET');
  });

  it('creates a budget', () => {
    const budget: CreateBudgetDto = {
      accountId: 'account-1',
      amount: 500,
      categoryId: 'category-1',
      currency: 'USD',
      month: '2026-06',
      name: 'Groceries',
      type: 'EXPENSE'
    };

    dataService.createBudget(budget).subscribe();

    const request = httpTestingController.expectOne('/api/v1/budgets');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(budget);
  });

  it('updates a budget', () => {
    const budget: UpdateBudgetDto = {
      amount: 650,
      categoryId: 'category-1',
      currency: 'USD',
      id: 'budget-1',
      month: '2026-06',
      name: 'Groceries',
      type: 'EXPENSE'
    };

    dataService.updateBudget({ budget, id: 'budget-1' }).subscribe();

    const request = httpTestingController.expectOne('/api/v1/budgets/budget-1');

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(budget);
  });

  it('fetches expense categories', () => {
    dataService.fetchExpenseCategories().subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/budgets/categories'
    );

    expect(request.request.method).toBe('GET');
  });

  it('creates an expense category', () => {
    const category: CreateExpenseCategoryDto = {
      color: '#0055aa',
      name: 'Groceries'
    };

    dataService.createExpenseCategory(category).subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/budgets/categories'
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(category);
  });

  it('updates an expense category', () => {
    const category: UpdateExpenseCategoryDto = {
      color: '#aa5500',
      id: 'category-1',
      name: 'Food'
    };

    dataService
      .updateExpenseCategory({ category, id: 'category-1' })
      .subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/budgets/categories/category-1'
    );

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(category);
  });

  it('deletes an expense category', () => {
    dataService.deleteExpenseCategory('category-1').subscribe();

    const request = httpTestingController.expectOne(
      '/api/v1/budgets/categories/category-1'
    );

    expect(request.request.method).toBe('DELETE');
  });

  it('deletes a budget', () => {
    dataService.deleteBudget('budget-1').subscribe();

    const request = httpTestingController.expectOne('/api/v1/budgets/budget-1');

    expect(request.request.method).toBe('DELETE');
  });
});
