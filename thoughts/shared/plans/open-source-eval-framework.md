# Open Source Eval Framework Contribution Plan

**Status:** In Progress (Track 1 scaffold complete locally)
**Priority:** High
**Task:** Publish 53-case eval framework as open source package
**Created:** 2026-02-24

## Execution Update (2026-02-24)

Completed locally:

- Package scaffold created at `tools/evals/finance-agent-evals/`
- Public dataset artifact exported:
  - `tools/evals/finance-agent-evals/datasets/ghostfolio-finance-agent-evals.v1.json`
- Framework-agnostic runner exported:
  - `tools/evals/finance-agent-evals/index.mjs`
- Package smoke test script added:
  - `tools/evals/finance-agent-evals/scripts/smoke-test.mjs`

Remaining for external completion:

- Publish npm package
- Open PR to LangChain
- Submit benchmark/dataset links

## Overview

Contribute the Ghostfolio AI Agent's 53-case evaluation framework to the open source community, meeting the Gauntlet G4 open source contribution requirement.

### Current State

**Eval Framework Location:** `apps/api/src/app/endpoints/ai/evals/`

**Dataset Breakdown:**
- 23 happy path cases (`dataset/happy-path.dataset.ts`)
- 10 edge cases (`dataset/edge-case.dataset.ts`)
- 10 adversarial cases (`dataset/adversarial.dataset.ts`)
- 10 multi-step cases (`dataset/multi-step.dataset.ts`)

**Framework Components:**
- `mvp-eval.interfaces.ts` - Type definitions
- `mvp-eval.runner.ts` - Eval execution with LangSmith integration
- `mvp-eval.runner.spec.ts` - Test suite
- `ai-observability.service.ts` - Tracing and metrics

### Goal

Create a reusable, framework-agnostic eval package for financial AI agents that can be:
1. Installed via npm for other projects
2. Integrated with LangChain/LangSmith
3. Submitted to LLM benchmark leaderboards
4. Cited as an academic dataset

---

## Option 1: Standalone npm Package

### Package Structure

```
@ghostfolio/finance-agent-evals/
├── package.json
├── README.md
├── LICENSE (Apache 2.0)
├── src/
│   ├── types/
│   │   ├── eval-case.interface.ts
│   │   ├── eval-result.interface.ts
│   │   └── eval-config.interface.ts
│   ├── datasets/
│   │   ├── index.ts (exports all)
│   │   ├── happy-path.dataset.ts
│   │   ├── edge-case.dataset.ts
│   │   ├── adversarial.dataset.ts
│   │   └── multi-step.dataset.ts
│   ├── runner/
│   │   ├── eval-runner.ts (framework-agnostic)
│   │   ├── langsmith-integration.ts
│   │   └── reporting.ts
│   └── index.ts
├── tests/
│   └── eval-runner.spec.ts
└── examples/
    ├── langchain-usage.ts
    └── standalone-usage.ts
```

### Package Metadata

**package.json:**
```json
{
  "name": "@ghostfolio/finance-agent-evals",
  "version": "1.0.0",
  "description": "53-case evaluation framework for financial AI agents with LangSmith integration",
  "keywords": [
    "ai",
    "eval",
    "finance",
    "agent",
    "benchmark",
    "langsmith",
    "langchain",
    "testing"
  ],
  "author": "Ghostfolio",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/ghostfolio/finance-agent-evals"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test"
  },
  "peerDependencies": {
    "langsmith": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

### Extracted Interfaces

**eval-case.interface.ts:**
```typescript
export interface FinanceAgentEvalCase {
  id: string;
  category: 'happy_path' | 'edge_case' | 'adversarial' | 'multi_step';
  input: {
    query: string;
    symbols?: string[];
  };
  intent: string;
  setup?: {
    holdings?: Record<string, Holding>;
    quotesBySymbol?: Record<string, Quote>;
    storedMemoryTurns?: MemoryTurn[];
    llmThrows?: boolean;
    marketDataErrorMessage?: string;
  };
  expected: {
    requiredTools: string[];
    minCitations?: number;
    answerIncludes?: string[];
    memoryTurnsAtLeast?: number;
    requiredToolCalls?: Array<{
      tool: string;
      status: 'success' | 'failed';
    }>;
    verificationChecks?: Array<{
      check: string;
      status: 'passed' | 'warning' | 'failed';
    }>;
  };
}
```

### README.md Structure

```markdown
# @ghostfolio/finance-agent-evals

[![npm version](https://badge.fury.io/js/%40ghostfolio%2Ffinance-agent-evals.svg)](https://www.npmjs.com/package/@ghostfolio/finance-agent-evals)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

53-case evaluation framework for financial AI agents with domain-specific test coverage.

## Overview

This eval framework provides comprehensive test coverage for financial AI agents across four categories:
- **22 Happy Path** scenarios (normal operations)
- **10 Edge Cases** (missing data, boundary conditions)
- **10 Adversarial** inputs (prompt injection, data exfiltration)
- **10 Multi-Step** reasoning scenarios (tool chaining)

## Installation

\`\`\`bash
npm install @ghostfolio/finance-agent-evals
\`\`\`

## Usage

### Standalone
\`\`\`typescript
import { FinanceAgentEvalRunner, DATASETS } from '@ghostfolio/finance-agent-evals';

const runner = new FinanceAgentEvalRunner({
  agent: myFinanceAgent,
  datasets: [DATASETS.HAPPY_PATH, DATASETS.ADVERSARIAL]
});

const results = await runner.runAll();
console.log(results.summary);
\`\`\`

### With LangSmith
\`\`\`typescript
import { FinanceAgentEvalRunner } from '@ghostfolio/finance-agent-evals';
import { Client } from 'langsmith';

const runner = new FinanceAgentEvalRunner({
  agent: myFinanceAgent,
  langsmith: new Client({ apiKey: process.env.LANGCHAIN_API_KEY })
});

await runner.runAndUpload('ghostfolio-finance-agent');
\`\`\`

## Categories

### Happy Path (22 cases)
Portfolio analysis, risk assessment, market data queries, rebalancing, stress testing.

### Edge Cases (10 cases)
Empty portfolios, data unavailable, single-symbol edge cases, boundary conditions.

### Adversarial (10 cases)
SQL injection, prompt injection, privilege escalation, data exfiltration attempts.

### Multi-Step (10 cases)
Tool chaining, complex reasoning, multi-account aggregation, comprehensive analysis.

## Citation

If you use this eval framework in your research, please cite:

\`\`\`bibtex
@software{ghostfolio_finance_agent_evals_2026,
  title={Finance Agent Evaluation Framework},
  author={{Ghostfolio Contributors}},
  year={2026},
  url={https://github.com/ghostfolio/finance-agent-evals}
}
\`\`\`

## License

Apache 2.0 - see [LICENSE](LICENSE)
```

---

## Option 2: LangChain Integration PR

### Target Repository
https://github.com/langchain-ai/langchain

### PR Location
`libs/langchain/langchain/evaluation/`

### Files to Create

**`evaluation/finance_agent/evaluator.ts`:**
```typescript
import { BaseEvaluator } from '../base';
import { FinanceAgentEvalCase, FINANCE_AGENT_EVALUATIONS } from './dataset';

export class FinanceAgentEvaluator extends BaseEvaluator {
  /**
   * Evaluate a finance agent against 53-case benchmark
   */
  async evaluate(
    agent: AgentInterface,
    config?: { categories?: EvalCategory[] }
  ): Promise<FinanceAgentEvalResult> {
    // Implementation
  }
}

export const FINANCE_AGENT_DATASET: FinanceAgentEvalCase[] = FINANCE_AGENT_EVALUATIONS;
```

**`evaluation/finance_agent/dataset.ts`:**
- Export all 53 cases
- Match LangChain eval format
- Include metadata (difficulty, tags, domain)

**`evaluation/finance_agent/prompts.ts`:**
- Evaluation prompts for finance domain
- Scoring rubrics
- Hallucination detection patterns

### PR Description

```markdown
## Feature: Finance Agent Evaluation Framework

### Summary
Adds 53-case evaluation framework for financial AI agents with comprehensive coverage across happy path, edge cases, adversarial inputs, and multi-step reasoning.

### What's Included
- 22 happy path scenarios (portfolio analysis, risk, market data)
- 10 edge cases (empty portfolios, data issues, boundaries)
- 10 adversarial cases (injection attacks, data violations)
- 10 multi-step cases (tool chaining, complex reasoning)
- LangSmith integration for result tracking
- Framework-agnostic design (works with any agent)

### Usage
\`\`\`typescript
import { FinanceAgentEvaluator } from 'langchain/evaluation/finance_agent';

const evaluator = new FinanceAgentEvaluator();
const results = await evaluator.evaluate({
  agent: myFinanceAgent,
  categories: ['happy_path', 'adversarial']
});
\`\`\`

### Motivation
Financial agents require domain-specific evaluation:
- Regulatory compliance verification
- Numerical consistency checks
- Market data coverage validation
- Risk assessment accuracy

This framework fills the gap for finance domain evals in LangChain.

### Testing
- All 53 cases included
- Pass rate tracking by category
- Integration with LangSmith datasets

### Checklist
- [x] Tests pass locally
- [x] Documentation included
- [x] Types exported
- [x] LangSmith integration working
```

---

## Option 3: LLM Benchmark Leaderboards

### Humanity's Last Test
https://github.com/GoodForge/Humanity-s-Last-Test

**Format Required:**
```json
{
  "name": "Finance Agent Benchmark",
  "description": "53-case evaluation for financial AI agents",
  "tasks": [
    {
      "name": "portfolio_analysis",
      "input": "Analyze my portfolio allocation",
      "expected_tools": ["portfolio_analysis"],
      "success_criteria": "allocation_sum ≈ 1.0"
    },
    // ... 51 more tasks
  ],
  "metadata": {
    "domain": "finance",
    "categories": ["happy_path", "edge_case", "adversarial", "multi_step"],
    "total_cases": 52
  }
}
```

### LangSmith Public Datasets
1. Create dataset in LangSmith dashboard
2. Upload all 53 cases with tags
3. Make public
4. Submit to LangSmith eval catalog

### Steps
1. **Format for LangSmith:**
   ```typescript
   const cases = DATASETS.ALL.map(case => ({
     inputs: { query: case.input.query },
     outputs: { expected_tools: case.expected.requiredTools },
     metadata: {
       category: case.category,
       intent: case.intent,
       difficulty: 'medium'
     }
   }));
   ```

2. **Upload to LangSmith:**
   ```typescript
   import { Client } from 'langsmith';
   const client = new Client();
   await client.createDataset(
     'finance-agent-benchmark',
     { data: cases, public: true }
   );
   ```

3. **Submit to catalog:**
   - Tag: `finance-agent`
   - Description: "53-case financial AI agent benchmark"
   - Link: GitHub repo

---

## Option 4: Academic Dataset Release

### Zenodo DOI Minting

1. **Create GitHub release:**
   - Tag: `v1.0.0`
   - Include: full dataset, README, citation file

2. **Register with Zenodo:**
   - Link GitHub repository
   - Auto-archive on release
   - Get DOI: `10.5281/zenodo.XXXXXX`

3. **Citation File (CITATION.cff):**
   ```yaml
  cff-version: 1.2.0
   title: Finance Agent Evaluation Framework
   message: If you use this dataset, please cite it.
   version: 1.0.0
   date-released: 2026-02-24
   authors:
     - family-names: Petrusenko
       given-names: Max
       affiliation: Gauntlet G4
   license: Apache-2.0
   url: https://github.com/ghostfolio/finance-agent-evals
   doi: 10.5281/zenodo.XXXXXX
   keywords:
     - AI evaluation
     - Finance agents
     - Benchmark
     - Dataset
   ```

4. **Submit to datasets portals:**
   - Papers With Code
   - Hugging Face Datasets
   - Kaggle Datasets

---

## Implementation Plan

### Phase 1: Package Extraction (2 hours)

**Step 1.1:** Create package structure
- Initialize `@ghostfolio/finance-agent-evals`
- Copy eval code from `apps/api/src/app/endpoints/ai/evals/`
- Remove Ghostfolio-specific dependencies

**Step 1.2:** Framework abstraction
- Extract interfaces to be framework-agnostic
- Create adapter pattern for LangChain integration
- Support standalone usage

**Step 1.3:** Build and test
- Configure TypeScript compilation
- Add unit tests
- Test locally with Ghostfolio agent

### Phase 2: Publish to npm (1 hour)

**Step 2.1:** Package metadata
- Write comprehensive README
- Add LICENSE (Apache 2.0)
- Configure package.json

**Step 2.2:** Build and publish
```bash
npm run build
npm publish --access public
```

**Step 2.3:** Verification
- Install in test project
- Run example usage
- Verify all exports work

### Phase 3: LangChain Contribution (2 hours)

**Step 3.1:** Fork langchain-ai/langchain
```bash
gh repo fork langchain-ai/langchain
```

**Step 3.2:** Create feature branch
```bash
git checkout -b feature/finance-agent-evals
```

**Step 3.3:** Implement integration
- Add `evaluation/finance_agent/` directory
- Port 53 cases to LangChain format
- Write evaluator class
- Add documentation

**Step 3.4:** Submit PR
```bash
git push origin feature/finance-agent-evals
gh pr create --title "Feature: Finance Agent Evaluation Framework (53 cases)"
```

### Phase 4: Benchmark Submissions (1 hour)

**Step 4.1:** Format for leaderboards
- Humanity's Last Test JSON
- LangSmith dataset format
- Generic benchmark format

**Step 4.2:** Submit to platforms
- LangSmith public datasets
- Humanity's Last Test (PR or issue)
- Papers With Code

**Step 4.3:** Publish results
- Document benchmark methodology
- Include Ghostfolio agent results
- Make reproducible

### Phase 5: Academic Release (1 hour)

**Step 5.1:** Zenodo registration
- Link GitHub repo
- Configure metadata
- Enable auto-archive

**Step 5.2:** Create GitHub release v1.0.0
- Trigger Zenodo archive
- Get DOI

**Step 5.3:** Submit to portals
- Hugging Face Datasets
- Kaggle Datasets
- Update README with DOI

---

## Success Criteria

### Package Publication
- ✅ Package available on npm: `@ghostfolio/finance-agent-evals`
- ✅ Installable and usable in external project
- ✅ README with usage examples
- ✅ Apache 2.0 license

### LangChain Integration
- ✅ PR submitted to langchain-ai/langchain
- ✅ Code follows LangChain patterns
- ✅ Documentation in LangChain docs
- ✅ Tests pass in LangChain CI

### Benchmark Leaderboards
- ✅ Dataset on LangSmith public catalog
- ✅ Submitted to Humanity's Last Test
- ✅ Results reproducible by others
- ✅ Methodology documented

### Academic Citation
- ✅ DOI assigned (Zenodo)
- ✅ CITATION.cff included
- ✅ Listed on Papers With Code
- ✅ Available on Hugging Face

### Documentation
- ✅ Tasks.md updated
- ✅ ADR created for open source strategy
- ✅ Original implementation preserved

---

## Risk Mitigation

**Risk:** LangChain PR rejected
- **Mitigation:** Package can stand alone; PR is optional enhancement

**Risk:** DOI minting delay
- **Mitigation:** Zenodo is fast (<5 min); have backup plan

**Risk:** Package naming conflict
- **Mitigation:** Use scoped package `@ghostfolio/`; check availability first

**Risk:** Benchmark format incompatibility
- **Mitigation:** Create adapters for multiple formats; submit to compatible platforms

---

## Open Questions

1. Should package include the runner or just datasets?
   - **Decision:** Include both for completeness

2. LangSmith dependency: required or optional?
   - **Decision:** Optional peer dependency

3. Which benchmark platforms should we prioritize?
   - **Decision:** LangSmith (native), Humanity's Last Test (visibility)

4. Should we include Ghostfolio's benchmark results?
   - **Decision:** Yes, as baseline for others to compare

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Package Extraction | 2 hours | None |
| Phase 2: Publish to npm | 1 hour | Phase 1 |
| Phase 3: LangChain PR | 2 hours | Phase 1 |
| Phase 4: Benchmark Submissions | 1 hour | Phase 1 |
| Phase 5: Academic Release | 1 hour | None |
| **Total** | **7 hours** | Can parallelize Phase 2-5 |

---

## Next Steps

1. ✅ Task created in task tracker
2. Begin Phase 1: Package extraction
3. Update Tasks.md with progress
4. Create ADR documenting open source strategy
5. Execute phases in order
