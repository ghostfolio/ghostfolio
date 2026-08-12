import {
  getScopesOfAccess,
  getScopesOfOwnAccess,
  getScopesOfUnrestrictedImpersonation,
  hasScope,
  scopes
} from '@ghostfolio/common/scopes';

describe('Scopes', () => {
  describe('Get scopes of access', () => {
    it('Scopes take precedence over the permissions', () => {
      expect(
        getScopesOfAccess({
          permissions: ['READ'],
          scopes: [scopes.portfolioRead]
        })
      ).toEqual([scopes.portfolioRead]);
    });

    it('Derive from the permission to read', () => {
      // An access created before the scopes have been introduced has no scopes
      expect(
        getScopesOfAccess({ permissions: ['READ'], scopes: [] })
      ).toContain(scopes.portfolioReadValues);
    });

    it('Derive from the permission to read restricted', () => {
      expect(
        getScopesOfAccess({ permissions: ['READ_RESTRICTED'], scopes: [] })
      ).not.toContain(scopes.portfolioReadValues);
    });

    it('Without permissions and scopes', () => {
      expect(getScopesOfAccess({})).not.toContain(scopes.portfolioReadValues);
    });
  });

  describe('Get scopes of own access', () => {
    it('Covers every scope', () => {
      expect(getScopesOfOwnAccess()).toEqual(Object.values(scopes));
    });
  });

  describe('Get scopes of unrestricted impersonation', () => {
    it('Excludes the monetary values', () => {
      expect(getScopesOfUnrestrictedImpersonation()).not.toContain(
        scopes.portfolioReadValues
      );
    });

    it('Allows reading the portfolio', () => {
      expect(getScopesOfUnrestrictedImpersonation()).toContain(
        scopes.portfolioRead
      );
    });
  });

  describe('Has scope', () => {
    it('Present scope', () => {
      expect(hasScope([scopes.portfolioRead], scopes.portfolioRead)).toEqual(
        true
      );
    });

    it('Absent scope', () => {
      expect(
        hasScope([scopes.portfolioRead], scopes.portfolioReadValues)
      ).toEqual(false);
    });

    it('Without scopes', () => {
      expect(hasScope(undefined, scopes.portfolioRead)).toEqual(false);
    });
  });
});
