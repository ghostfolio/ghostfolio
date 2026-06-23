(global as any).$localize = (
  messageParts: TemplateStringsArray,
  ...expressions: any[]
) => {
  return String.raw({ raw: messageParts }, ...expressions);
};

jest.mock('@angular/localize', () => {
  return {};
});

const { internalRoutes } = require('./routes');

describe('internalRoutes', () => {
  it('defines the portfolio budget route', () => {
    expect(internalRoutes.portfolio.subRoutes.budget).toEqual({
      path: 'budget',
      routerLink: ['/portfolio', 'budget'],
      title: 'Budget'
    });
  });
});
