import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { FinancialQuoteCard, FinancialChart, CompanyProfileCard } from '../financial-tools'

// Mock Recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    Area: () => <div data-testid="area" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  }
})

describe('FinancialQuoteCard', () => {
  it('renders stock symbol and price correctly', () => {
    const props = {
      toolCallId: 'test-id',
      input: { symbol: 'AAPL' },
      output: {
        data: {
          c: 150.00,
          d: 2.50,
          dp: 1.69,
        },
        metadata: {
          symbol: 'AAPL'
        }
      }
    }

    render(<FinancialQuoteCard {...props} />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('150.00')).toBeInTheDocument()
    expect(screen.getByText('+2.50 (1.69%)')).toBeInTheDocument()
  })

  it('renders loading state when output is missing', () => {
    const props = {
      toolCallId: 'test-id',
      input: { symbol: 'GOOGL' }
    }

    render(<FinancialQuoteCard {...props} />)

    expect(screen.getByText('Fetching quote for GOOGL...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    const props = {
      toolCallId: 'test-id',
      input: { symbol: 'INVALID' },
      errorText: 'Symbol not found'
    }

    render(<FinancialQuoteCard {...props} />)

    expect(screen.getByText('Quote Failed')).toBeInTheDocument()
    expect(screen.getByText('Symbol not found')).toBeInTheDocument()
  })
})

describe('FinancialChart', () => {
  const mockData = [
    { name: '2023-01-01', price: 100 },
    { name: '2023-01-02', price: 105 },
    { name: '2023-01-03', price: 102 }
  ]

  it('renders line chart with data', () => {
    const props = {
      toolCallId: 'chart-id',
      input: { symbols: ['AAPL'], chartType: 'line' },
      output: {
        data: {
          chartData: mockData,
          metadata: { symbols: ['AAPL'] }
        },
        success: true
      }
    }

    render(<FinancialChart {...props} />)

    expect(screen.getByText('AAPL Chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})

describe('CompanyProfileCard', () => {
  it('renders company profile correctly', () => {
    const props = {
      toolCallId: 'profile-id',
      input: { symbol: 'AAPL' },
      output: {
        data: {
          name: 'Apple Inc',
          ticker: 'AAPL',
          logo: 'https://example.com/logo.png',
          finnhubIndustry: 'Technology',
          marketCapitalization: 3000000,
          weburl: 'https://apple.com'
        }
      }
    }

    render(<CompanyProfileCard {...props} />)

    expect(screen.getByText('Apple Inc')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('3.00T')).toBeInTheDocument()
  })
})
