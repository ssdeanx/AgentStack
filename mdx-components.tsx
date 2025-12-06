import type { MDXComponents } from 'mdx/types'
import Link from "next/link"

// Custom components that work with MDX plugins
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings with proper spacing and colors
    h1: ({ children }) => (
      <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground scroll-m-20">
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      // Skip rendering accidental MDX frontmatter that may appear verbatim
      // in documents when frontmatter parsing is disabled. Frontmatter
      // typically contains `title:` and `description:` keys; if we detect
      // that pattern, render nothing to avoid duplicating metadata in the page
      // body and to prevent SSR/CSR hydration mismatches.
      if (typeof children === "string") {
        const lower = children.toLowerCase()
        if (lower.includes("title:") && lower.includes("description:")) return null
      }

      return (
        <h2 className="mb-4 mt-10 text-2xl font-bold text-foreground scroll-m-20">
          {children}
        </h2>
      )
    },
    h3: ({ children }) => (
      <h3 className="mb-3 mt-8 text-xl font-semibold text-foreground scroll-m-20">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-6 text-lg font-semibold text-foreground scroll-m-20">
        {children}
      </h4>
    ),

    // Paragraphs with proper line height
    p: ({ children }) => (
      <p className="mb-4 leading-7 text-muted-foreground">
        {children}
      </p>
    ),

    // Links with hover effects
    a: ({ href, children }) => (
      <Link
        href={href || "#"}
        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
      >
        {children}
      </Link>
    ),

    // Lists with proper spacing
    ul: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 text-muted-foreground">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 text-muted-foreground">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-7">{children}</li>
    ),

    // Blockquotes with left border
    blockquote: ({ children }) => (
      <blockquote className="mt-6 mb-4 border-l-2 border-primary/20 pl-6 italic text-muted-foreground">
        {children}
      </blockquote>
    ),

    // Code blocks and inline code - these work with rehype-highlight
    code: ({ children, className }) => {
      const isInline = !className?.includes('language-')
      return isInline ? (
        <code className="relative rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
          {children}
        </code>
      ) : (
        <code className={`${className} text-sm`}>
          {children}
        </code>
      )
    },
    pre: ({ children, className }) => (
      <pre className={`mb-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm ${className || ''}`}>
        {children}
      </pre>
    ),

    // Horizontal rule
    hr: () => <hr className="my-8 border-border" />,

    // Tables with responsive design
    table: ({ children }) => (
      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-border bg-muted px-4 py-2 text-left font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-4 py-2 text-muted-foreground">
        {children}
      </td>
    ),

    // Images with responsive design
    img: ({ src, alt, title }) => (
      <img
        src={src}
        alt={alt || ""}
        title={title}
        className="my-4 rounded-lg border border-border"
      />
    ),

    // Merge with any additional components
    ...components,
  }
}
