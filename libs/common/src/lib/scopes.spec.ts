import {
  SCOPES_OF_READ_ACCESS,
  SCOPES_OF_READ_RESTRICTED_ACCESS,
  SCOPES_OF_WRITE_ACCESS,
  getScopesOfAccess,
  getScopesOfOwnAccess,
  getScopesOfUnrestrictedImpersonation,
  hasScope,
  scopes
} from '@ghostfolio/common/scopes';

describe('Scopes', () => {
  describe('Scopes of read access', () => {
    // A new scope which reads data has to be added here deliberately, because
    // an access which reads data receives this list
    it('Covers every read scope', () => {
      expect(SCOPES_OF_READ_ACCESS).toEqual([
        scopes.accountRead,
        scopes.activityRead,
        scopes.portfolioRead,
        scopes.portfolioReadValues,
        scopes.watchlistRead
      ]);
    });
  });

  describe('Scopes of write access', () => {
    // A new scope which changes data has to be added here deliberately,
    // because the ImpersonationWriteGuard blocks the writes it does not cover
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

  describe('Scopes of read and write access', () => {
    // A new scope has to belong to exactly one of the two lists. A scope which
    // belongs to neither list is granted to nobody, and a write scope which is
    // missing from SCOPES_OF_WRITE_ACCESS is granted to every read access.
    it('Cover every scope exactly once', () => {
      const scopesOfReadAndWriteAccess = [
        ...SCOPES_OF_READ_ACCESS,
        ...SCOPES_OF_WRITE_ACCESS
      ].sort();

      expect(scopesOfReadAndWriteAccess).toEqual(Object.values(scopes).sort());
    });
  });

  describe('Get scopes of access', () => {
    it('Gives the scopes of the access', () => {
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d',
          scopes: [scopes.portfolioRead, scopes.portfolioReadValues]
        })
      ).toEqual([scopes.portfolioRead, scopes.portfolioReadValues]);
    });

    it('Without the scope to read the values', () => {
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d',
          scopes: [scopes.portfolioRead]
        })
      ).not.toContain(scopes.portfolioReadValues);
    });

    it('Without scopes', () => {
      expect(
        getScopesOfAccess({
          granteeUserId: 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d'
        })
      ).toEqual([]);
    });
  });

  describe('Get scopes of public access', () => {
    it('Allows reading the portfolio', () => {
      expect(
        getScopesOfAccess({ scopes: [...SCOPES_OF_READ_RESTRICTED_ACCESS] })
      ).toContain(scopes.portfolioRead);
    });

    it('Excludes the accounts and the watchlist', () => {
      const scopesOfAccess = getScopesOfAccess({
        scopes: [...SCOPES_OF_READ_RESTRICTED_ACCESS]
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

    it('Cannot expose the monetary values', () => {
      expect(
        getScopesOfAccess({ scopes: [...SCOPES_OF_READ_ACCESS] })
      ).not.toContain(scopes.portfolioReadValues);
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
