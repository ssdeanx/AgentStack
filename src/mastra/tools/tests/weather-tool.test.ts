import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { weatherTool } from '../weather-tool'

describe('weatherTool', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns weather data for valid location', async () => {
        // Mock geocoding response
        const mockGeocodingResponse = {
            results: [
                { latitude: 40.7128, longitude: -74.006, name: 'New York' },
            ],
        }
        // Mock weather response
        const mockWeatherResponse = {
            current: {
                time: '2024-01-15T12:00',
                temperature_2m: 15.5,
                apparent_temperature: 14.2,
                relative_humidity_2m: 65,
                wind_speed_10m: 12.3,
                wind_gusts_10m: 18.5,
                weather_code: 1,
            },
        }

        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGeocodingResponse,
            } as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockWeatherResponse,
            } as any)

        const result = await weatherTool.execute({ location: 'New York' })

        expect(result).toBeDefined()
        expect(result.location).toBe('New York')
        expect(typeof result.temperature).toBe('number')
        expect(typeof result.humidity).toBe('number')
        expect(result.conditions).toBeDefined()
    })

    it('returns weather data for single word location', async () => {
        const mockGeocodingResponse = {
            results: [{ latitude: 48.8566, longitude: 2.3522, name: 'Paris' }],
        }
        const mockWeatherResponse = {
            current: {
                temperature_2m: 22.0,
                apparent_temperature: 21.5,
                relative_humidity_2m: 55,
                wind_speed_10m: 8.0,
                wind_gusts_10m: 12.0,
                weather_code: 0,
            },
        }

        vi.spyOn(global, 'fetch')
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockGeocodingResponse,
            } as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockWeatherResponse,
            } as any)

        const result = await weatherTool.execute({ location: 'Paris' })
        expect(result.location).toBe('Paris')
        expect(typeof result.temperature).toBe('number')
    })

    it('throws error when location not found', async () => {
        vi.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] }),
        } as any)

        await expect(
            weatherTool.execute({ location: 'NonExistentCity12345' })
        ).rejects.toThrow("Location 'NonExistentCity12345' not found")
    })
})
