import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { RepositoryCard, PullRequestList, IssueCard, CommitHistoryList } from '../github-tools'

// ... (Existing tests for RepositoryCard, PullRequestList, IssueCard)

describe('CommitHistoryList', () => {
  it('renders commit history', () => {
    const props = {
      toolCallId: 'commit-id',
      input: { owner: 'owner', repo: 'repo' },
      output: {
        commits: [
          {
            sha: '1234567890',
            message: 'feat: Add new feature',
            author: { name: 'Dev', date: '2023-01-01' },
            html_url: 'https://github.com/owner/repo/commit/123'
          }
        ],
        success: true
      }
    }

    render(<CommitHistoryList {...props} />)

    expect(screen.getByText('feat: Add new feature')).toBeInTheDocument()
    expect(screen.getByText(/Dev/)).toBeInTheDocument()
    expect(screen.getByText('1234567')).toBeInTheDocument() // Short SHA
  })
})