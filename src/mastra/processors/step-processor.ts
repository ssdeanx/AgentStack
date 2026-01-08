import type { Processor, ProcessInputStepArgs, ProcessInputStepResult } from "@mastra/core";

export class DynamicModelProcessor implements Processor {
  id = "dynamic-model";

  async processInputStep({
    stepNumber,
    model,
    toolChoice,
    messageList,
  }: ProcessInputStepArgs): Promise<ProcessInputStepResult> {
    // Use a fast model for initial response
    if (stepNumber === 0) {
      return { model: "openai/gpt-4o-mini" };
    }

    // Disable tools after 5 steps to force completion
    if (stepNumber > 5) {
      return { toolChoice: "none" };
    }

    // No changes for other steps
    return {};
  }
}