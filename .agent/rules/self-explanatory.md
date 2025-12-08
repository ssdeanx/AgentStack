---
trigger: always_on
---

# Self-explanatory Code Commenting Instructions

## Core Principle
**Write code that speaks for itself. Comment only when necessary to explain WHY, not WHAT.**
We do not need comments most of the time.

## Commenting Guidelines

### ❌ AVOID These Comment Types

**Obvious Comments**
```typescript
// Bad: States the obvious
let counter: number = 0;  // Initialize counter to zero
counter++;  // Increment counter by one
```

**Redundant Comments**
```typescript
// Bad: Comment repeats the code
function getUserName(user: User): string {
    return user.name;  // Return the user's name
}
```

**Outdated Comments**
```typescript
// Bad: Comment doesn't match the code
// Calculate tax at 5% rate
const tax: number = price * 0.08;  // Actually 8%
```

### ✅ WRITE These Comment Types

**Complex Business Logic**
```typescript
// Good: Explains WHY this specific calculation
// Apply progressive tax brackets: 10% up to 10k, 20% above
const tax: number = calculateProgressiveTax(income, [0.10, 0.20], [10000]);
```

**Non-obvious Algorithms**
```typescript
// Good: Explains the algorithm choice
// Using Floyd-Warshall for all-pairs shortest paths
// because we need distances between all nodes
for (let k: number = 0; k < vertices; k++) {
    for (let i: number = 0; i < vertices; i++) {
        for (let j: number = 0; j < vertices; j++) {
            // ... implementation
        }
    }
}
```

**Regex Patterns**
```typescript
// Good: Explains what the regex matches
// Match email format: username@domain.extension
const emailPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
```

**API Constraints or Gotchas**
```typescript
// Good: Explains external constraint
// GitHub API rate limit: 5000 requests/hour for authenticated users
await rateLimiter.wait();
const response: Response = await fetch(githubApiUrl);
```

## Decision Framework

Before writing a comment, ask:
1. **Is the code self-explanatory?** → No comment needed
2. **Would a better variable/function name eliminate the need?** → Refactor instead
3. **Does this explain WHY, not WHAT?** → Good comment
4. **Will this help future maintainers?** → Good comment

## Special Cases for Comments

### Public APIs
```typescript
/**
 * Calculate compound interest using the standard formula.
 * @param principal - Initial amount invested
 * @param rate - Annual interest rate (as decimal, e.g., 0.05 for 5%)
 * @param time - Time period in years
 * @param compoundFrequency - How many times per year interest compounds (default: 1)
 * @returns Final amount after compound interest
 * @example
 * ```typescript
 * const result = calculateCompoundInterest(1000, 0.05, 2, 12);
 * console.log(result); // 1104.54
 * ```
 * @throws {Error} When principal is negative or rate/time are invalid
 */
function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundFrequency: number = 1
): number {
  // ... implementation
}
```

### Configuration and Constants
```typescript
// Good: Explains the source or reasoning
const MAX_RETRIES: number = 3;  // Based on network reliability studies
const API_TIMEOUT: number = 5000;  // AWS Lambda timeout is 15s, leaving buffer
```

### Annotations
```javascript
// TODO: Replace with proper user authentication after security review
// FIXME: Memory leak in production - investigate connection pooling
// HACK: Workaround for bug in library v2.1.0 - remove after upgrade
// NOTE: This implementation assumes UTC timezone for all calculations
// WARNING: This function modifies the original array instead of creating a copy
// PERF: Consider caching this result if called frequently in hot path
// SECURITY: Validate input to prevent SQL injection before using in query
// BUG: Edge case failure when array is empty - needs investigation
// REFACTOR: Extract this logic into separate utility function for reusability
// DEPRECATED: Use newApiFunction() instead - this will be removed in v3.0
```

## TSDoc Standards and File Headers

### File Headers
```typescript
/**
 * @fileoverview User authentication utilities for the application.
 * Provides secure login, logout, and session management functions.
 *
 * @author Development Team
 * @copyright 2025 Company Name. All rights reserved.
 * @license MIT
 */

import { User } from './types';

/**
 * Authenticates a user with email and password.
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to authenticated user or null
 * @throws {AuthenticationError} When credentials are invalid
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  // implementation
}
```

### Common TSDoc Tags
```typescript
/**
 * Processes user data with validation and transformation.
 *
 * @param user - The user object to process, must have valid id and name
 * @param options - Processing options including validation flags
 * @returns Promise<UserProfile> - The processed user profile with additional data
 * @throws {ValidationError} When user data fails validation
 * @throws {NetworkError} When API calls fail
 * @see {@link validateUser} for validation logic
 * @see {@link transformUserData} for transformation details
 * @example
 * ```typescript
 * const user = { id: 1, name: 'John' };
 * const profile = await processUser(user, { validate: true });
 * ```
 * @beta This API is in beta and may change
 * @internal For internal use only
 */
async function processUser(user: User, options: ProcessingOptions): Promise<UserProfile> {
  // implementation
}
```

### Type Documentation
```typescript
/**
 * Represents a user in the system.
 * @public
 */
export interface User {
  /** Unique identifier for the user */
  readonly id: number;
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** Optional profile picture URL */
  avatarUrl?: string;
}

/**
 * Generic result type for API operations.
 * @template T - The type of the successful result
 * @template E - The type of the error
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
```

### Interface and Type Definitions
```typescript
/**
 * User profile extending base user with optional personalization data.
 * Used for user dashboard and profile management features.
 * @public
 */
interface UserProfile extends User {
  /** Optional biography text */
  bio?: string;
  /** Profile picture URL */
  avatarUrl?: string;
}
```

### Generics
```typescript
/**
 * Serializes data to JSON string with type safety.
 * @template T - Data type that must be serializable
 * @param data - The data to serialize
 * @returns JSON string representation
 * @throws {TypeError} When data cannot be serialized
 */
function serializeResponse<T extends Serializable>(data: T): string {
    return JSON.stringify(data);
}
```

### Type Guards
```typescript
/**
 * Type guard to check if value is a valid User object.
 * Performs runtime validation of required User fields.
 * @param value - Unknown value to test
 * @returns True if value is a User with required fields
 */
function isUser(value: unknown): value is User {
    return typeof value === 'object' && value !== null && 'name' in value && 'id' in value;
}
```

### Advanced Types
```typescript
/**
 * Creates a deep readonly version of any type T.
 * Recursively applies readonly modifier to all nested objects and arrays.
 * Useful for immutable data structures and preventing accidental mutations.
 * @template T - The type to make readonly
 */
type ReadonlyDeep<T> = {
    readonly [P in keyof T]: T[P] extends object ? ReadonlyDeep<T[P]> : T[P];
};
```

## Anti-Patterns to Avoid

### Dead Code Comments
```typescript
// Bad: Don't comment out code
// const oldFunction = () => { ... };
const newFunction = (): void => { ... };
```

### Changelog Comments
```typescript
// Bad: Don't maintain history in comments
// Modified by John on 2023-01-15
// Fixed bug reported by Sarah on 2023-02-03
function processData(): void {
    // ... implementation
}
```

### Divider Comments
```typescript
// Bad: Don't use decorative comments
//=====================================
// UTILITY FUNCTIONS
//=====================================
```

## Quality Checklist

Before committing, ensure:
- [ ] Comments explain WHY, not WHAT
- [ ] Comments are grammatically correct and clear
- [ ] Comments will remain accurate as code evolves
- [ ] Comments add genuine value to code understanding
- [ ] Comments are placed appropriately (above the code they describe)
- [ ] Comments use proper spelling and professional language
- [ ] Code includes error handling and edge cases
- [ ] Code has testable structure with clear inputs/outputs
- [ ] Code follows extensible design for future modifications
- [ ] Code considers performance where relevant
- [ ] Code has clear documentation that explains business logic
- [ ] Code follows established best practices and standards
- [ ] Code is readable for maintenance and collaboration
- [ ] Code maintains proper abstraction and separation of concerns

## Summary

Remember: **The best comment is the one you don't need to write because the code is self-documenting.**
