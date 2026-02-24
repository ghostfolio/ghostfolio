# Architecture Decision Records

**Status**: Active
**Format**: ADR-XXX: Short title
**Location**: docs/adr/

## Template

```markdown
# ADR-XXX: [Short Title]

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Context**: [What is the issue we're facing?]

## Options Considered

### Option A: [Name] ✅ (CHOSEN)
- Description: [One-liner]
- Pros: [Key benefits]
- Cons: [Key drawbacks]

### Option B: [Name] ❌ (REJECTED)
- Description: [One-liner]
- Pros: [Key benefits]
- Cons: [Key drawbacks]
- Reason: [Why we rejected this]

## Decision

[1-2 sentences explaining what we chose and why]

## Trade-offs / Consequences

- **Positive**: [What we gain]
- **Negative**: [What we lose or complicate]

## What Would Change Our Mind

[Specific conditions that would make us revisit this decision]

## Related

- Tests: [Link to tests/evals]
- PRs: [Link to PRs]
- Supersedes: [ADR-XXX if applicable]
```

## Rules

1. **Before architectural change**: Check relevant ADRs
2. **Citation required**: Must cite ADR in proposed changes
3. **Update after refactor**: Keep ADR current or mark SUPERSEDED
4. **Debug rule**: Bug investigation starts with ADR review

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | [TBD] | - | - |
