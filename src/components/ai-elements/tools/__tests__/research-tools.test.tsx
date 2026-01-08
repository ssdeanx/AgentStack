import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { ArxivPaperCard, SearchResultList, NewsCarousel } from '../research-tools'

// ... (Existing tests)

describe('NewsCarousel', () => {
  it('renders news items', () => {
    const props = {
      toolCallId: 'news-id',
      input: { q: 'AI News' },
      output: {
        news_results: [
          {
            title: 'AI Breakthrough',
            source: 'Tech Daily',
            date: '2 hours ago',
            link: 'https://example.com/news',
            snippet: 'A major breakthrough in AI...'
          }
        ],
        success: true
      }
    }

    render(<NewsCarousel {...props} />)

    expect(screen.getByText('AI Breakthrough')).toBeInTheDocument()
    expect(screen.getByText('Tech Daily')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })
})