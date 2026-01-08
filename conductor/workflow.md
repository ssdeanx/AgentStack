# Project Workflow

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`
2. **Context-Driven Development:** Deep awareness of product goals, tech stack, and user needs drives every action.
3. **Spec-Driven Development (2026 Best Practice):** Never implement without a clear specification and plan approved by the human in the loop.
4. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation.
5. **Test-Driven Development (TDD):** Write unit tests before implementing functionality to ensure dual validation.
6. **Strict Code Quality:** Aim for >90% code coverage for all modules (2026 Standard).
7. **Atomic Task Chunking:** Break down work into small, manageable units to maintain clarity and prevent AI drift.
8. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools to ensure single execution.

## Task Workflow

All tasks follow a strict lifecycle:

### Standard Task Workflow

1. **Select Task:** Choose the next available task from `plan.md` in sequential order.

2. **Mark In Progress:** Before beginning work, edit `plan.md` and change the task from `[ ]` to `[~]`.

3. **Establish Spec (If needed):** If the task is complex, document the implementation spec in the relevant `spec.md` before coding.

4. **Write Failing Tests (Red Phase):**
   - Create or update the test file for the feature.
   - Write tests that define the acceptance criteria.
   - **CRITICAL:** Run tests and confirm they fail. Do not proceed until you have failing tests.

5. **Implement to Pass Tests (Green Phase):**
   - Write the minimum code necessary to make the tests pass.
   - Confirm all tests pass.

6. **Refactor:**
   - Improve code clarity and performance without changing behavior.
   - Rerun tests to ensure they still pass.

7. **Verify Coverage:** Run coverage reports. Target: >90% coverage for new code.

8. **Document Deviations:** If implementation differs from the tech stack, update `tech-stack.md` first.

9. **Commit Task Changes:**
   - Stage all code changes related to the task and the update to `plan.md`.
   - Create a commit with a clear, concise message (e.g., `feat(ui): Create basic HTML structure for calculator`).

10. **Attach Task Summary with Git Notes:**
    - **Draft Note Content:** Create a detailed summary for the completed task including changes, files, and "why".
    - **Attach Note:** Attach the summary to the task commit hash using `git notes add -m "<summary>" <hash>`.

11. **Record Progress:** Mark the task as completed `[x]` in `plan.md` and append the commit SHA.

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** This protocol is executed immediately after all tasks in a **Phase** are completed.

1. **Phase Verification:**
   - **Automated Tests:** Run the full suite for the phase. Propose fixes up to two times if failures occur.
   - **Manual Verification:** Propose a step-by-step plan for the user to verify the user-facing goals of the phase.

2. **User Approval Gate:** Await explicit "yes" or confirmation from the user after manual verification.

3. **Create Checkpoint Commit:**
   - Stage all changes.
   - Perform the commit with a message like `conductor(checkpoint): Checkpoint end of Phase X`.

4. **Attach Verification Report with Git Notes:**
   - **Draft Note Content:** Create a report including the automated test results and user confirmation.
   - **Attach Note:** Attach to the checkpoint commit.

5. **Record Phase Checkpoint:** Update the phase header in `plan.md` with the checkpoint commit SHA: `[checkpoint: <sha>]`.

### Quality Gates

Before completing a phase, verify:

- [ ] All tests pass
- [ ] Code coverage meets requirements (>90%)
- [ ] Code follows project style guides
- [ ] All public functions/methods documented
- [ ] Type safety enforced
- [ ] No linting or static analysis errors
- [ ] Security-first: No hardcoded secrets or injection risks

## Development Commands

### Setup
```bash
# Install dependencies
npm install
```

### Daily Development
```bash
# Start dev server
npm run dev

# Run tests
npm test

# Lint & Format
npm run lint
npm run format
```

### Quality Check
```bash
# Run coverage
npm run coverage

# Type check
npm run typecheck
```

## Testing Requirements

### Unit Testing
- Every module must have corresponding tests.
- Use appropriate test setup/teardown (fixtures, beforeEach/afterEach).
- Mock external dependencies.
- Test both success and failure cases.

### Integration Testing
- Test complete user flows.
- Verify database transactions.
- Test authentication and authorization.

## Commit Guidelines

### Message Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintenance tasks
- `conductor`: Setup and management tasks

## Definition of Done

A phase is complete when:
1. All tasks in the phase are marked `[x]` in `plan.md`.
2. Automated tests pass with >90% coverage.
3. User has manually verified and approved the phase.
4. Changes are committed with a proper message.
5. Git note with phase summary is attached to the commit.
6. Checkpoint SHA is recorded in `plan.md`.
