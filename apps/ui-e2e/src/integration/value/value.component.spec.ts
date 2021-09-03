describe('ui', () => {
  beforeEach(() => cy.visit('/iframe.html?id=valuecomponent--loading'));
  it('should render the component', () => {
    cy.get('gf-value').should('exist');
  });
});
