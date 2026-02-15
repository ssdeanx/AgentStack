/**
 * Shared heading/body typography classes for all public-facing sections.
 * Use these instead of ad-hoc Tailwind strings to guarantee a consistent
 * visual hierarchy across every marketing/public page.
 */

export const SECTION_HEADING = {
    /** Standard section H2 — used for most landing/public section titles. */
    h2: 'text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl',
    /** Compact H2 variant for secondary sections or nested blocks. */
    h2Compact: 'text-2xl font-bold tracking-tight text-foreground sm:text-3xl',
    /** Hero H1 — only used on the primary hero section. */
    h1: 'text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl',
    /** Page title — used on `PageHeader` for sub-pages (about/pricing/blog/etc). */
    pageTitle: 'text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl',
    /** Card title — used in bento cards, feature cards, testimonial titles. */
    card: 'text-lg font-semibold text-foreground sm:text-xl',
} as const

export const SECTION_BODY = {
    /** Standard section subtitle / description text. */
    subtitle: 'text-lg text-muted-foreground lg:text-xl leading-relaxed',
    /** Constrained subtitle centered under a heading. */
    subtitleCentered: 'mx-auto max-w-2xl text-lg text-muted-foreground lg:text-xl leading-relaxed',
    /** Compact body text for cards and secondary blocks. */
    body: 'text-sm text-muted-foreground leading-relaxed',
    /** Label / overline text for badges and kicker text. */
    label: 'text-sm font-semibold uppercase tracking-wider text-muted-foreground',
} as const

export const SECTION_LAYOUT = {
    /** Standard centered header block above a section grid. */
    headerCenter: 'mb-12 text-center sm:mb-16',
    /** Left-aligned header block. */
    headerLeft: 'mb-12 sm:mb-16',
} as const
