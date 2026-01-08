import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'
import { WeatherCard, ForecastView } from '../weather-tool'

// ... (Existing WeatherCard tests)

describe('ForecastView', () => {
  it('renders forecast rows', () => {
    const props = {
      toolCallId: 'forecast-id',
      input: { location: 'London', days: 3 },
      output: {
        data: {
          forecast: {
            forecastday: [
              {
                date: '2023-01-02',
                day: {
                  avgtemp_c: 22,
                  condition: { text: 'Partly cloudy', icon: '//cdn.weatherapi.com/icon.png' }
                }
              },
              {
                date: '2023-01-03',
                day: {
                  avgtemp_c: 18,
                  condition: { text: 'Rain', icon: '//cdn.weatherapi.com/rain.png' }
                }
              }
            ]
          },
          location: { name: 'London' }
        }
      }
    }

    render(<ForecastView {...props} />)

    expect(screen.getByText('2-Day Forecast for London')).toBeInTheDocument()
    expect(screen.getByText('Partly cloudy')).toBeInTheDocument()
    expect(screen.getByText('Rain')).toBeInTheDocument()
    expect(screen.getByText('22°')).toBeInTheDocument()
  })
})