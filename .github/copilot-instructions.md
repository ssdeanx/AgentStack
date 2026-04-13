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
- Never run commands without checking with `#problems` / `'read/problems'` tool first. _This is critical to avoid errors._
- This is YOUR Internal TOOL. NOT PART OF THE USER PROJECT ITS YOUR OWN TOOL TO HELP YOU BUILD debug.
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
- 🧪 When editing a page/component (especially `app/**/page.tsx`), use VS Code interaction error checks (`get_errors` / `#problems`) on the edited files before and after changes.
- ⚙️ Internal error-tool enable flow (required for page edits):
    - 1) Activate VS Code interaction tools.
    - 2) Run `get_errors` on the exact files being edited (not project-wide).
    - 3) Fix reported issues.
    - 4) Run `get_errors` again on those same files to verify clean state.
- 🌐 When unsure about framework/API behavior while editing UI pages, use internet research tools first (`#web`, `#websearch`, or `fetch_webpage`) and then apply fixes.
- 🚫 Do not run project-wide type checks/lint commands by default for page edits. Use targeted `get_errors` checks unless the user explicitly asks for `typecheck`/`lint` runs.
- 📌 To update your memory bank, use [#update-memory-bank] tool to add new information.
- 🛠 Mastra mcp tools use [#mastradocs], [#mastraChanges], [#mastraexamples] tool.
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
- 🧩 Make sure server is running by running npm run dev.  Then you can use browser tool to actually analyze pages in real time.
- 🧩 This is helpful to make sure all changes to frontend, actually work as intended.

= Use `ast-grep` in terminal instead of `grep` for code searches to get structured results and avoid false positives.

- 🧪 Use subagents with `#runSubagent` tool for modular task execution and better context management, Use it to explore code, and other reasons as they come up also i believe can run it with `#agent`
- 🧪 When running subagents, always provide them with the necessary context and information to complete their tasks effectively. This includes relevant files, code snippets, and any specific instructions or goals for the subagent.
- 🧪 After running a subagent, review its output and results to ensure it has completed its task correctly and effectively. If the subagent's output is not satisfactory, consider re-running it with additional context or instructions.
- 🧪 Use the `#runSubagent` tool to delegate specific tasks to specialized subagents, allowing for more efficient and focused problem-solving.

- Make sure you use TSDoc comments for any thing you write in TypeScript. This will help ensure that your code is well-documented and easier for others (or yourself in the future) to understand. TSDoc comments provide a standardized way to describe the purpose, parameters, return values, and other important information about your code. Always include TSDoc comments for functions, classes, and complex logic to improve code readability and maintainability.
- When writing TSDoc comments, be clear and concise. Describe what the function or class does, its parameters, and its return value. If there are any side effects or important details, include those as well. This practice will greatly enhance the quality of your code and make it easier for others to use and maintain it in the future.

- 🧑‍💻 When working on code files, always ensure that you are following the project's coding standards and best practices. This includes adhering to naming conventions, code formatting, and design patterns commonly used in the project. Consistency in coding style helps maintain readability and makes it easier for other developers to understand and contribute to the codebase.
- 🧑‍💻 Before making any changes to the code, take the time to review the existing codebase and understand the context and dependencies of the code you are modifying. This will help you make informed decisions and avoid introducing bugs or breaking existing functionality.
- 🧑‍💻 Always fully use proper types.  Do not guess, check package api in node_modules to get all options and features.  Make sure you import and use types instead of making local ones, or local functions.  This will keep the code clean.  Also try to not use any or unknown unless you absolutely have to.

- If Vscode linting gets stale, then rerun npm run lint:ci to refresh it.  This can happen if you have a lot of file changes and the lint server gets overwhelmed or desynced.  Running the lint command will reset it and ensure you get accurate linting feedback in VS Code.