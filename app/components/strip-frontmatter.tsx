"use client"

import { useEffect } from "react"

// Small client-side utility to remove accidentally-rendered MDX frontmatter
// (some MDX loader configurations render frontmatter as page content). This
// will remove the first heading or paragraph node when it looks like YAML
// frontmatter (e.g. starts with "title:" or contains "description:").
export default function StripFrontmatter() {
  useEffect(() => {
    try {
      const main = document.querySelector("main")
      if (!main) {return}

      // look at the first few block children
      const candidates = Array.from(main.children).slice(0, 3)
      for (const el of candidates) {
        const text = (el.textContent || "").trim().toLowerCase()
        if (!text) {continue}
        // common YAML frontmatter markers
        if (text.startsWith("title:") || text.includes("title:") && text.includes("description:")) {
          el.remove()
          break
        }
      }
    } catch (e) {
      // intentionally no-op: if DOM shape is unexpected, don't break rendering
      // eslint-disable-next-line no-console
      console.debug("strip-frontmatter: no-op", e)
    }
  }, [])

  return null
}
