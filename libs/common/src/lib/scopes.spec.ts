import {
  Scope,
  SCOPES_OF_READ_ACCESS,
  SCOPES_OF_READ_RESTRICTED_ACCESS,
  SCOPES_OF_WRITE_ACCESS,
  getAccessLevel,
  getScopesOfAccess,
  getScopesOfAccessLevel,
  getScopesOfOwnAccess,
  getScopesOfUnrestrictedImpersonation,
  hasAnyScopeOfWriteAccess,
  hasScope,
  scopes
} from '@ghostfolio/common/scopes';
import { AccessLevel } from '@ghostfolio/common/types';

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

  describe('Get access level', () => {
    it('Write scopes with the monetary values', () => {
      expect(
        getAccessLevel([...SCOPES_OF_READ_ACCESS, ...SCOPES_OF_WRITE_ACCESS])
      ).toEqual('CREATE_READ_UPDATE_DELETE');
    });

    it('Write scopes without the monetary values', () => {
      expect(
        getAccessLevel([
          ...SCOPES_OF_READ_RESTRICTED_ACCESS,
          ...SCOPES_OF_WRITE_ACCESS
        ])
      ).toEqual('CREATE_READ_RESTRICTED_UPDATE_DELETE');
    });

    it('Read scopes with the monetary values', () => {
      expect(getAccessLevel([...SCOPES_OF_READ_ACCESS])).toEqual('READ');
    });

    it('Read scopes without the monetary values', () => {
      expect(getAccessLevel([...SCOPES_OF_READ_RESTRICTED_ACCESS])).toEqual(
        'READ_RESTRICTED'
      );
    });

    it('Without scopes', () => {
      expect(getAccessLevel(undefined)).toEqual('READ_RESTRICTED');
    });
  });

  describe('Get scopes of access level', () => {
    // A new access level has to be added here deliberately, because the type
    // of the record is exhaustive
    const accessLevels: Record<AccessLevel, true> = {
      CREATE_READ_RESTRICTED_UPDATE_DELETE: true,
      CREATE_READ_UPDATE_DELETE: true,
      READ: true,
      READ_RESTRICTED: true
    };

    it('Grants the write scopes without the monetary values', () => {
      expect(
        getScopesOfAccessLevel('CREATE_READ_RESTRICTED_UPDATE_DELETE')
      ).toEqual([
        ...SCOPES_OF_READ_RESTRICTED_ACCESS,
        ...SCOPES_OF_WRITE_ACCESS
      ]);
    });

    // The dialog compares the access level of the stored scopes with the
    // selected access level, hence both functions have to be inverse
    for (const accessLevel of Object.keys(accessLevels) as AccessLevel[]) {
      it(`Is inverse to the access level of ${accessLevel}`, () => {
        expect(getAccessLevel(getScopesOfAccessLevel(accessLevel))).toEqual(
          accessLevel
        );
      });
    }
  });

  describe('Get scopes of access', () => {
    it('Gives the scopes of the access', () => {
      expect(
        getScopesOfAccess({
          type: 'PRIVATE',
          scopes: [scopes.portfolioRead, scopes.portfolioReadValues]
        })
      ).toEqual([scopes.portfolioRead, scopes.portfolioReadValues]);
    });

    it('Without the scope to read the values', () => {
      expect(
        getScopesOfAccess({
          scopes: [scopes.portfolioRead],
          type: 'PRIVATE'
        })
      ).not.toContain(scopes.portfolioReadValues);
    });

    it('Without scopes', () => {
      expect(getScopesOfAccess({ type: 'PRIVATE' })).toEqual([]);
    });

    it('Gives the write scopes', () => {
      const scopesOfAccess = getScopesOfAccess({
        type: 'PRIVATE',
        scopes: [...SCOPES_OF_READ_ACCESS, ...SCOPES_OF_WRITE_ACCESS]
      });

      for (const scope of SCOPES_OF_WRITE_ACCESS) {
        expect(scopesOfAccess).toContain(scope);
      }
    });

    it('Drops an unknown scope', () => {
      expect(
        getScopesOfAccess({
          type: 'PRIVATE',
          scopes: [scopes.portfolioRead, 'portfolio:write']
        })
      ).toEqual([scopes.portfolioRead]);
    });
  });

  describe('Get scopes of public access', () => {
    it('Allows reading the portfolio', () => {
      expect(
        getScopesOfAccess({
          scopes: [...SCOPES_OF_READ_RESTRICTED_ACCESS],
          type: 'PUBLIC'
        })
      ).toContain(scopes.portfolioRead);
    });

    it('Excludes the accounts and the watchlist', () => {
      const scopesOfAccess = getScopesOfAccess({
        scopes: [...SCOPES_OF_READ_RESTRICTED_ACCESS],
        type: 'PUBLIC'
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
          ],
          type: 'PUBLIC'
        })
      ).toEqual([scopes.portfolioRead]);
    });

    it('Cannot expose the monetary values', () => {
      expect(
        getScopesOfAccess({
          scopes: [...SCOPES_OF_READ_ACCESS],
          type: 'PUBLIC'
        })
      ).not.toContain(scopes.portfolioReadValues);
    });

    // The dialog offers the write scopes for a private access only, hence this
    // function is the sole barrier for a public access
    it('Gives no write scope', () => {
      expect(
        getScopesOfAccess({
          scopes: [...SCOPES_OF_WRITE_ACCESS],
          type: 'PUBLIC'
        })
      ).toEqual([]);
    });
  });

  describe('Get scopes of access for the model context protocol', () => {
    it('Allows reading the portfolio', () => {
      expect(
        getScopesOfAccess({
          scopes: [...SCOPES_OF_READ_ACCESS],
          type: 'MCP'
        })
      ).toContain(scopes.portfolioRead);
    });

    it('Allows reading the accounts and the watchlist', () => {
      const scopesOfAccess = getScopesOfAccess({
        scopes: [...SCOPES_OF_READ_ACCESS],
        type: 'MCP'
      });

      expect(scopesOfAccess).toContain(scopes.accountRead);
      expect(scopesOfAccess).toContain(scopes.watchlistRead);
    });

    it('Cannot expose the monetary values', () => {
      expect(
        getScopesOfAccess({
          scopes: [...SCOPES_OF_READ_ACCESS],
          type: 'MCP'
        })
      ).not.toContain(scopes.portfolioReadValues);
    });

    it('Gives no write scope', () => {
      expect(
        getScopesOfAccess({
          scopes: [...SCOPES_OF_READ_ACCESS, ...SCOPES_OF_WRITE_ACCESS],
          type: 'MCP'
        }).filter((scope) => {
          return SCOPES_OF_WRITE_ACCESS.includes(scope as Scope);
        })
      ).toEqual([]);
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

  describe('Has any scope of write access', () => {
    it('Single write scope', () => {
      expect(hasAnyScopeOfWriteAccess([scopes.activityUpdate])).toEqual(true);
    });

    it('Read scopes only', () => {
      expect(hasAnyScopeOfWriteAccess([...SCOPES_OF_READ_ACCESS])).toEqual(
        false
      );
    });

    it('Without scopes', () => {
      expect(hasAnyScopeOfWriteAccess(undefined)).toEqual(false);
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
