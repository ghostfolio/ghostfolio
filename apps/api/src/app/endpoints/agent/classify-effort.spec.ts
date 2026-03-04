/**
 * Effort classification is now handled by an LLM (Haiku) call in
 * AgentService.classifyEffort(). The previous regex-based tests are no longer
 * applicable. Classification accuracy is validated through the agent eval suite
 * (eval-correctness, eval-latency).
 */

describe('classifyEffort', () => {
  it('placeholder — classification is LLM-based, tested via evals', () => {
    expect(true).toBe(true);
  });
});
