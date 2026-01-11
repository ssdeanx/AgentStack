import { describe, it, expect } from "vitest";
import { sourceDiversityScorer } from "../evals/scorers/custom-scorers";

describe("Custom Scorers", () => {
  describe("sourceDiversityScorer", () => {
    it("should score high for diverse sources", async () => {
      const output = {
        sources: [
          { url: "https://wikipedia.org/article", title: "Wikipedia Article" },
          { url: "https://nytimes.com/article", title: "NYT Article" },
          { url: "https://bbc.com/article", title: "BBC Article" }
        ]
      };

      const res = await (sourceDiversityScorer as any).run({ input: 'test', output });

      expect(res.score).toBeGreaterThan(0.5);
      const unique =
        res?.analyzeStepResult?.uniqueDomains ??
        res?.analyzeStepResult?.uniqueDomainCount ??
        res?.analyzeStepResult?.unique_domains ??
        res?.analyzeStepResult?.uniqueDomainsCount ??
        0;
      expect(unique).toBeGreaterThanOrEqual(3);
    });

    it("should score low and report issues for single-source dominance", async () => {
      const output = { sources: [ { url: 'https://example.com/a' }, { url: 'https://example.com/b' } ] };

      const res = await (sourceDiversityScorer as any).run({ input: 'test', output });

      expect(res.score).toBeLessThanOrEqual(0.5);
      expect(res.analyzeStepResult.issues).toContain('Limited domain diversity - mostly single source');
    });
  });
});
