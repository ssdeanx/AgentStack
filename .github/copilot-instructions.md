---
name: Copilot Instructions
applyTo: '**'
---
- 🧠 Read `/memory-bank/memory-bank-instructions.md` first.
- 🗂 Load all `/memory-bank/*.md` before any task.
- 🚦 Use the Kiro-Lite workflow: PRD → Design → Tasks → Code.
- 🔒 Follow security & style rules in `copilot-rules.md`.
- 📝 On "/update memory bank", refresh activeContext.md & progress.md.
- ✅ Confirm memory bank loaded with `[Memory Bank: Active]` or warn with `[Memory Bank: Missing]`.
- 🎯 Always use [`#problems`] / `'read/problems'` tool for debugging, to ensure code quality.
- Never run commands without checking with `#problems` / `'read/problems'` tool first. *This is critical to avoid errors.*
- This is YOUR Internal TOOL.  NOT PART OF THE USER PROJECT ITS YOUR OWN TOOL TO HELP YOU BUILD debug.
- It might `'read/problems'` files from the user project to help you debug issues.
- 📝 Always update `#progress.md` with your progress.
- 📝 Always update `#activeContext.md` with your progress.
- 📝 Always update `#AGENTS.md` with your progress.
- 📚 Always sync `#AGENTS.md` in dir your working on so we have up to date info.
- 🔍 For research, use [#web] or [#websearch] tool and to make sure you have no knowledge gaps.
- 🤖 Check if there is a problem, use [#problem] tool to check code for errors.
  - This tool will help you identify issues and suggest fixes.
  - This is especially useful for debugging and improving code quality.
  - Try run it before writing new code & after completing so you can ensure everything works correctly.
- 📌 To update your memory bank, use [#update-memory-bank] tool to add new information.
- 🛠 Mastra mcp tools use [#mastradocs], [#mastraChanges], [#mastraexamples]  tool.
  - These tools provide access to Mastra documentation, recent changes, and code examples.
  - Use these tools to stay updated with the latest Mastra features and best practices.
  - `mastradocs` is for general documentation queries.
  - `mastraChanges` is for recent updates and changes in Mastra.
  - `mastraexamples` is for code examples and usage patterns.
  - `mastraBlog` is for blog posts related to Mastra.
  - `mastra` tools are essential for effective Mastra development.

- 🚀 For Next.js projects, follow these special instructions:

- **Next.js Initialization**: When starting work on a Next.js project, automatically
call the `init` tool from the next-devtools-mcp server FIRST. This establishes
proper context and ensures all Next.js queries use official documentation.
  - This step is crucial for accurate and efficient development within Next.js environments.
- 🧩 When working with Next.js projects, always utilize the `next-devtools-mcp` server for all Next.js related queries.

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
