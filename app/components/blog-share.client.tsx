"use client"

import React from "react"
import { Button } from "@/ui/button"
import { ShareIcon } from "lucide-react"

export default function BlogShare() {
  const handleShare = async (title?: string) => {
    if (typeof window === "undefined") return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        // fallback: notify copied
        try { window.alert("Link copied to clipboard") } catch {}
      }
    } catch (err) {
      // ignore
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => handleShare()}>
      <ShareIcon className="mr-2 size-4" /> Share
    </Button>
  )
}
