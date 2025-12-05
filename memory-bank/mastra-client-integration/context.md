# Context: Mastra Client SDK Integration

## Feature Status

**Status:** 🔄 Dashboard Phase (50% Complete on Phase 6)

**Created:** Nov 27, 2025

**Last Updated:** Dec 5, 2025

---

## Current State

### What Exists ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Mastra Backend | ✅ Complete | 22+ agents, 30+ tools, 10 workflows, 4 networks |
| `src/mastra/index.ts` | ✅ Complete | All agents/workflows registered, API routes configured |
| `next.config.ts` | ✅ Complete | `serverExternalPackages` configured for Mastra |
| `app/globals.css` | ✅ Complete | Tailwind 4 + oklch CSS variables |
| `app/test/` | ✅ Complete | Server action demo with weatherAgent |
| AI Elements | ✅ Installed | 30 components in `src/components/ai-elements/` |
| shadcn/ui | ✅ Installed | 19 components in `ui/` |
| `.env.example` | ✅ Complete | All env vars documented |
| `@mastra/client-js` | ✅ Installed | v0.16.15 in package.json |
| `lib/mastra-client.ts` | ✅ Complete | TASK-002 implemented |
| `app/layout.tsx` | ✅ Complete | TASK-004 implemented |
| `app/page.tsx` | ✅ Complete | TASK-005 implemented |
| `app/chat/page.tsx` | ✅ Complete | TASK-006 + TASK-007 implemented |
| README updated | ✅ Complete | TASK-009 implemented |
| **Admin Dashboard** | 🔄 50% | TASK-011 - 10 pages created, needs refinement |

### What's Remaining ⬜

| Component | Status | Notes |
|-----------|--------|-------|
| Dashboard component modularization | ⬜ | Break pages into smaller components |
| Next.js 16 routing fixes | ⬜ | Fix href/Link patterns |
| Error boundaries | ⬜ | Add proper error handling |
| React Query integration | ⬜ | Better data caching |
| TypeScript improvements | ⬜ | Type MastraClient responses |
| Unit tests for hooks | ⬜ | Test lib/hooks/use-mastra.ts |

---

## Active Decisions

### AD-1: Development Server Strategy
**Question:** Run Mastra embedded in Next.js or as standalone server?

**Decision:** Standalone server at `:4111`

**Rationale:**
- Client SDK requires running Mastra server
- Swagger UI available for API testing
- Clearer separation of frontend/backend
- Matches production deployment model

### AD-2: Dual Pattern Approach
**Question:** Server actions only, or also client SDK?

**Decision:** Support both patterns

**Rationale:**
- Server actions for SSR (SEO, initial load)
- Client SDK for real-time features (streaming)
- Flexibility for different use cases

---

## Scope Boundaries

### In Scope (v1)
- Install and configure `@mastra/client-js`
- Fix `layout.tsx` and `page.tsx`
- Create client SDK demo page
- Streaming response support
- Documentation updates

### Out of Scope (v1)
- Conversation persistence/memory in UI
- Full chat application
- Authentication/authorization
- Multi-agent network UI
- Production deployment

---

## Dependencies

### External
- `@mastra/client-js` - Client SDK (to be installed)
- `next-themes` - Already installed for dark mode

### Internal
- `src/mastra/index.ts` - ✅ Complete
- `src/components/ai-elements/` - ✅ Ready to use
- `ui/` - ✅ Ready to use

---

## Testing Strategy

### Manual Testing
1. Run `npm run dev` → Next.js starts at `:3000`
2. Run `npm run dev:mastra` (or current `dev` script) → Mastra starts at `:4111`
3. Navigate to `/test` → Server action works
4. Navigate to `/chat` → Client SDK works
5. Toggle dark mode → Theme persists

### Automated Testing (Future)
- Vitest tests for client SDK wrapper (if created)
- E2E tests with Playwright

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Version conflict with Mastra packages | Low | High | Use `@latest` tags, match existing versions |
| CORS issues between `:3000` and `:4111` | Medium | Medium | `next.config.ts` already has `allowedDevOrigins` |
| Missing env vars | Low | High | Clear documentation, `.env.example` |

---

## Next Steps

1. **User:** Review PRD and run `/approve prd`
2. **Copilot:** Generate design.md (already done)
3. **User:** Review design and run `/approve design`
4. **Copilot:** Confirm tasks.md (already done)
5. **User:** Review tasks and run `/approve tasks`
6. **User:** Run `/implement TASK-001` to start implementation

---

## References

- [Mastra Next.js Guide](https://mastra.ai/docs/frameworks/web-frameworks/next-js)
- [Mastra Client SDK](https://mastra.ai/reference/client-js/mastra-client)
- [Memory Bank: activeContext.md](../activeContext.md)
- [Memory Bank: progress.md](../progress.md)
