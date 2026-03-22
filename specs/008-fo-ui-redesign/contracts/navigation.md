# Navigation Contract: Family Office UI Redesign

**Feature**: 008-fo-ui-redesign
**Date**: 2026-03-22

## Primary Navigation Structure

The header navigation for authenticated users MUST display exactly these 5 top-level items:

### 1. Dashboard (direct link)
- **Route**: `/family-office`
- **Label**: "Dashboard"
- **Behavior**: Direct navigation (no submenu)

### 2. Partnerships (dropdown menu)
- **Label**: "Partnerships"
- **Sub-items**:
  | Label | Route | Description |
  |---|---|---|
  | Entities | `/entities` | Entity management (trusts, LLCs, etc.) |
  | Partnerships | `/partnerships` | Partnership list and details |
  | Distributions | `/distributions` | Distribution tracking |
  | Portfolio Views | `/portfolio-views` | Configurable performance views |

### 3. K-1 Center (dropdown menu)
- **Label**: "K-1 Center"
- **Sub-items**:
  | Label | Route | Description |
  |---|---|---|
  | K-1 Import | `/k1-import` | Upload and parse K1 documents |
  | K-1 Documents | `/k-documents` | Browse parsed K1 documents |
  | Cell Mapping | `/cell-mapping` | K1 box definition management |

### 4. Analysis (direct link)
- **Route**: `/portfolio` (existing portfolio page with analysis, activities, allocations tabs)
- **Label**: "Analysis"
- **Behavior**: Direct navigation (no submenu)

### 5. Admin (dropdown menu, conditional)
- **Label**: "Admin"
- **Visibility**: Shows only when `hasPermissionToAccessAdminControl` is true
- **Sub-items**:
  | Label | Route | Condition |
  |---|---|---|
  | Admin Control | (existing admin route) | `hasPermissionToAccessAdminControl` |
  | Accounts | (existing accounts route) | Always |
  | Resources | `/resources` | Always |
  | Pricing | `/pricing` | `hasPermissionForSubscription` |
  | Legacy Pages | (submenu or section) | Always |

### Legacy Pages (accessible from Admin > Legacy or via direct URL)
| Label | Route |
|---|---|
| Overview | `/home` |
| Holdings | `/home/holdings` |
| Summary | `/home/summary` |
| Markets | `/home/markets` |
| Watchlist | `/home/watchlist` |
| FIRE Calculator | `/portfolio/fire` |
| X-Ray | `/portfolio/x-ray` |

## Mobile Navigation

The mobile hamburger menu (account dropdown, `d-flex d-sm-none` items) MUST mirror the same 5-group structure with all sub-items expanded flat (since nested mat-menus are awkward on mobile).

## Route Preservation

All existing routes MUST continue to work. No routes are removed or redirected. Only the navigation UI changes — the route table in `app.routes.ts` remains intact.

## Default Route Change

| Current | Target |
|---|---|
| `/**` → `home` | `/**` → `family-office` |

The wildcard redirect in `app.routes.ts` changes from `redirectTo: 'home'` to `redirectTo: 'family-office'`.
