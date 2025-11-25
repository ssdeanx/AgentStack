import type { MCPServerPrompts } from "@mastra/mcp";
import { unified } from "unified";
import remarkParse from "remark-parse";
import matter from "gray-matter";
import type { Node } from "unist";

const prompts = [
  {
    name: "new_daily_note",
    description: "Create a new daily note.",
    version: "1.0.0",
  },
  {
    name: "summarize_note",
    description: "Give me a TL;DR of the note.",
    version: "1.0.0",
  },
  {
    name: "brainstorm_ideas",
    description: "Brainstorm new ideas based on a note.",
    version: "1.0.0",
  },
];

function stringifyNode(node: Node): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node && Array.isArray(node.children))
    return node.children.map(stringifyNode).join("");
  return "";
}

export async function analyzeMarkdown(md: string) {
  const { content } = matter(md);
  const tree = unified().use(remarkParse).parse(content);
  const headings: string[] = [];
  const wordCounts: Record<string, number> = {};
  let currentHeading = "untitled";
  wordCounts[currentHeading] = 0;
  tree.children.forEach((node) => {
    if (node.type === "heading" && node.depth === 2) {
      currentHeading = stringifyNode(node);
      headings.push(currentHeading);
      wordCounts[currentHeading] = 0;
    } else {
      const textContent = stringifyNode(node);
      if (textContent.trim()) {
        wordCounts[currentHeading] =
          (wordCounts[currentHeading] || 0) + textContent.split(/\\s+/).length;
      }
    }
  });
  return { headings, wordCounts };
}

const getPromptMessages: MCPServerPrompts["getPromptMessages"] = async ({
  name,
  args,
}) => {
  switch (name) {
    case "new_daily_note":
      const today = new Date().toISOString().split("T")[0];
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Create a new note titled \"${today}\" with sections: \"## Tasks\", \"## Meetings\", \"## Notes\".`,
          },
        },
      ];
    case "summarize_note":
      if (!args?.noteContent) throw new Error("No content provided");
      const metaSum = await analyzeMarkdown(args.noteContent as string);
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Summarize each section in ≤ 3 bullets.\\n\\n### Outline\\n${metaSum.headings.map((h) => `- ${h} (${metaSum.wordCounts[h] || 0} words)`).join("\\n")}`.trim(),
          },
        },
      ];
    case "brainstorm_ideas":
      if (!args?.noteContent) throw new Error("No content provided");
      const metaBrain = await analyzeMarkdown(args.noteContent as string);
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Brainstorm 3 ideas for underdeveloped sections below ${args?.topic ? `on ${args.topic}` : "."}\\n\\nUnderdeveloped sections:\\n${metaBrain.headings.length ? metaBrain.headings.map((h) => `- ${h}`).join("\\n") : "- (none, pick any)"}`,
          },
        },
      ];
    default:
      throw new Error(`Prompt \"${name}\" not found`);
  }
};

export const promptHandlers: MCPServerPrompts = {
  listPrompts: async () => prompts,
  getPromptMessages,
};
