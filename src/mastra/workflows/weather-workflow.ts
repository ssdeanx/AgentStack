import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    95: 'Thunderstorm',
  };
  return conditions[code] || 'Unknown';
}

const fetchWeather = createStep({
  id: 'fetch-weather',
  description: 'Fetches weather forecast for a given city',
  inputSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData, writer }) => {
    const tracer = trace.getTracer('weather-workflow');
    const span = tracer.startSpan('fetch-weather', {
      attributes: {
        city: inputData.city,
      },
    });

    try {
    if (!inputData?.city) {
      throw new Error('City not provided in input data');
    }

    // Emit workflow progress start
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: "Fetching weather data",
        stepId: "fetch-weather",
      },
      id: "fetch-weather"
    });

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: Array<{ latitude: number; longitude: number; name: string }>;
    };

    if (geocodingData.results === undefined || geocodingData.results === null || geocodingData.results.length === 0) {
      throw new Error(`Location '${inputData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    const forecast = {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0,
      ),
      location: name,
    };

    // Emit workflow progress completion
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "done",
        message: "Weather data fetched successfully",
        stepId: "fetch-weather",
      },
      id: "fetch-weather"
    });

    span.setAttribute('precipitationChance', forecast.precipitationChance);
    span.setAttribute('condition', forecast.condition);
    span.end();
    return forecast;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      throw error;
    }
  },
});

const planActivities = createStep({
  id: 'plan-activities',
  description: 'Suggests activities based on weather conditions',
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra, writer }) => {
    const tracer = trace.getTracer('weather-workflow');
    const span = tracer.startSpan('plan-activities', {
      attributes: {
        location: inputData.location,
        condition: inputData.condition,
      },
    });

    try {
    const forecast = inputData;

    if (!forecast?.date) {
      throw new Error('Forecast data not found');
    }

    // Emit workflow progress start
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: "Planning activities based on weather",
        stepId: "plan-activities",
      },
      id: "plan-activities"
    });

    const agent = mastra?.getAgent('weatherAgent');
    if (agent === undefined || agent === null) {
      throw new Error('Weather agent not found');
    }

    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      For each day in the forecast, structure your response exactly as follows:

      📅 [Day, Month Date, Year]
      ═══════════════════════════

      🌡️ WEATHER SUMMARY
      • Conditions: [brief description]
      • Temperature: [X°C/Y°F to A°C/B°F]
      • Precipitation: [X% chance]

      🌅 MORNING ACTIVITIES
      Outdoor:
      • [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      🌞 AFTERNOON ACTIVITIES
      Outdoor:
      • [Activity Name] - [Brief description including specific location/route]
        Best timing: [specific time range]
        Note: [relevant weather consideration]

      🏠 INDOOR ALTERNATIVES
      • [Activity Name] - [Brief description including specific venue]
        Ideal for: [weather condition that would trigger this alternative]

      ⚠️ SPECIAL CONSIDERATIONS
      • [Any relevant weather warnings, UV index, wind conditions, etc.]

      Guidelines:
      - Suggest 2-3 time-specific outdoor activities per day
      - Include 1-2 indoor backup options
      - For precipitation >50%, lead with indoor activities
      - All activities must be specific to the location
      - Include specific venues, trails, or locations
      - Consider activity intensity based on temperature
      - Keep descriptions concise but informative

      Maintain this exact formatting for consistency, using the emoji and section headers as shown.`;

    const response = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const {fullStream} = response as unknown as { fullStream?: ReadableStream<unknown> }
    const {textStream} = response as unknown as { textStream?: ReadableStream<unknown> }

    if (writer !== undefined && writer !== null) {
      if (fullStream !== undefined && typeof (fullStream as unknown as { pipeTo?: unknown }).pipeTo === 'function') {
        await (fullStream as unknown as ReadableStream<unknown>).pipeTo(writer as unknown as WritableStream)
      } else if (textStream !== undefined && typeof (textStream as unknown as { pipeTo?: unknown }).pipeTo === 'function') {
        await (textStream as unknown as ReadableStream<unknown>).pipeTo(writer as unknown as WritableStream)
      }
    }

    const activitiesText = (await response.text) ?? '';

    const result = {
      activities: activitiesText,
    };

    // Emit workflow progress completion
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "done",
        message: "Activities planned successfully",
        stepId: "plan-activities",
      },
      id: "plan-activities"
    });

    span.setAttribute('activitiesLength', activitiesText.length);
    span.end();
    return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      throw error;
    }
  },
});

const weatherWorkflow = createWorkflow({
  id: 'weatherWorkflow',
  inputSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(fetchWeather)
  .then(planActivities);

weatherWorkflow.commit();

export { weatherWorkflow };
