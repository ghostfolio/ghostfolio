import {
  SCOPES_OF_WRITE_ACCESS,
  getScopesOfAccess,
  getScopesOfOwnAccess,
  getScopesOfUnrestrictedImpersonation,
  hasScope,
  scopes
} from '@ghostfolio/common/scopes';

describe('Scopes', () => {
  describe('Scopes of write access', () => {
    // A new scope which changes data has to be added here deliberately,
    // because the read scopes are derived by the exclusion of this list
    it('Covers every write scope', () => {
      expect(SCOPES_OF_WRITE_ACCESS).toEqual([
        scopes.accountCreate,
        scopes.accountDelete,
        scopes.accountUpdate,
        scopes.activityCreate,
        scopes.activityDelete,
        scopes.activityUpdate,
        scopes.watchlistCreate,
        scopes.watchlistDelete
      ]);
    });
  });

  describe('Get scopes of access', () => {
    it('Scopes take precedence over the permissions', () => {
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d',
          permissions: ['READ'],
          scopes: [scopes.portfolioRead]
        })
      ).toEqual([scopes.portfolioRead]);
    });

    it('Derive from the permission to read', () => {
      // An access created before the scopes have been introduced has no scopes
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d',
          permissions: ['READ'],
          scopes: []
        })
      ).toContain(scopes.portfolioReadValues);
    });

    it('Derive from the permission to read restricted', () => {
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d',
          permissions: ['READ_RESTRICTED'],
          scopes: []
        })
      ).not.toContain(scopes.portfolioReadValues);
    });

    it('The permission to read gives no write scope', () => {
      const scopesOfAccess = getScopesOfAccess({
        granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d',
        permissions: ['READ'],
        scopes: []
      });

      for (const scope of SCOPES_OF_WRITE_ACCESS) {
        expect(scopesOfAccess).not.toContain(scope);
      }
    });

    it('Without permissions and scopes', () => {
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d'
        })
      ).not.toContain(scopes.portfolioReadValues);
    });
  });

  describe('Get scopes of public access', () => {
    it('Allows reading the portfolio', () => {
      expect(getScopesOfAccess({ permissions: ['READ_RESTRICTED'] })).toContain(
        scopes.portfolioRead
      );
    });

    it('Excludes the accounts and the watchlist', () => {
      const scopesOfAccess = getScopesOfAccess({
        permissions: ['READ_RESTRICTED']
      });

      expect(scopesOfAccess).not.toContain(scopes.accountRead);
      expect(scopesOfAccess).not.toContain(scopes.watchlistRead);
    });

    it('Cannot be widened by the scopes', () => {
      expect(
        getScopesOfAccess({
          scopes: [
            scopes.portfolioRead,
            scopes.portfolioReadValues,
            scopes.watchlistRead
          ]
        })
      ).toEqual([scopes.portfolioRead]);
    });

    it('Cannot be widened by the permission to read', () => {
      expect(getScopesOfAccess({ permissions: ['READ'] })).not.toContain(
        scopes.portfolioReadValues
      );
    });
  });

  describe('Get scopes of own access', () => {
    // A new scope has to be added here deliberately to confirm that it is
    // granted to the owner of the data
    it('Covers every scope', () => {
      expect(getScopesOfOwnAccess()).toEqual([
        scopes.accountCreate,
        scopes.accountDelete,
        scopes.accountRead,
        scopes.accountUpdate,
        scopes.activityCreate,
        scopes.activityDelete,
        scopes.activityRead,
        scopes.activityUpdate,
        scopes.portfolioRead,
        scopes.portfolioReadValues,
        scopes.watchlistCreate,
        scopes.watchlistDelete,
        scopes.watchlistRead
      ]);
    });
  });

  describe('Get scopes of unrestricted impersonation', () => {
    // A new scope has to be added here deliberately to confirm that it is
    // granted to an administrator impersonating an arbitrary user
    it('Covers every read scope but the monetary values', () => {
      expect(getScopesOfUnrestrictedImpersonation()).toEqual([
        scopes.accountRead,
        scopes.activityRead,
        scopes.portfolioRead,
        scopes.watchlistRead
      ]);
    });

    it('Gives no write scope', () => {
      const scopesOfImpersonation = getScopesOfUnrestrictedImpersonation();

      for (const scope of SCOPES_OF_WRITE_ACCESS) {
        expect(scopesOfImpersonation).not.toContain(scope);
      }
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
