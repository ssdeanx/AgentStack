# Specification: Custom AI UI Components for Mastra Tools

## 1. Overview
The goal of this track is to enhance the user experience of the AI chat interface by implementing specialized React components for key Mastra tools. Instead of displaying raw JSON outputs, the chat will render rich, interactive UI elements for tools like financial data, GitHub repositories, and weather information.

## 2. Requirements

### 2.1 Functional Requirements
- **Financial Tools UI:**
  - Create a `FinancialQuoteCard` for stock/crypto quotes (price, change, etc.).
  - Create a `FinancialChart` component using Recharts for historical data.
  - Support tools: `polygonStockQuotesTool`, `finnhubQuotesTool`, `alphaVantageStockTool`.

- **GitHub Tools UI:**
  - Create a `RepositoryCard` for repository details (stars, forks, description).
  - Create a `PullRequestList` component for PR listings.
  - Create an `IssueCard` for issue details.
  - Support tools: `listRepositories`, `listPullRequests`, `getIssue`.

- **Weather Tool UI:**
  - Create a `WeatherCard` displaying current conditions, temperature, and forecast.
  - Support tool: `weatherTool`.

- **Registry Integration:**
  - Update `src/components/ai-elements/tools/index.ts` to export new components.
  - Ensure dynamic mapping between tool IDs and their UI components.

### 2.2 Technical Requirements
- Use **shadcn/ui** components as primitives.
- Use **Tailwind CSS 4** for styling.
- Ensure all components are responsive and support dark mode.
- Components must handle "loading", "success", and "error" states gracefully.
- Follow the existing pattern in `src/components/ai-elements/custom/`.

## 3. Architecture
- **Location:** `src/components/ai-elements/tools/`
- **Pattern:**
  - Each tool category (Financial, GitHub, Weather) gets its own file (e.g., `financial-tools.tsx`).
  - Components accept `toolCallId`, `input`, and `output` as props.
  - Components are exported and registered in a central registry map.

## 4. User Experience
- When a user asks "What's the stock price of AAPL?", they see a styled stock card instead of JSON.
- When a user asks "Show me open PRs", they see a list of interactive PR cards.
- Loading states provide visual feedback (skeletons/spinners) while the tool executes.
