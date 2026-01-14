import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import Bottleneck from 'bottleneck'

/**
 * Shared HTTP client factory and helpers
 * - Provides a rate-limited axios-backed fetch wrapper
 * - Supports per-client retries/backoff, timeouts, and response types
 */

export interface HttpClientOptions {
    minTime?: number // Bottleneck minTime (ms)
    maxConcurrent?: number // Bottleneck max concurrent
    retries?: number
    // eslint-disable-next-line no-unused-vars
    retryDelay?: (retryCount: number, error: any) => number
    timeout?: number
    headers?: Record<string, string>
    baseURL?: string
    maxContentLength?: number
    maxBodyLength?: number
}

export interface HttpFetchInit {
    method?: string
    timeout?: number
    signal?: AbortSignal
    responseType?: 'json' | 'text' | 'arraybuffer'
    headers?: Record<string, string>
    params?: Record<string, string | number | boolean>
}

export interface HttpFetchResponse {
    ok: boolean
    status: number
    statusText: string
    data: unknown
    headers: Record<string, string>
    json<T = unknown>(): Promise<T>
    text(): Promise<string>
    arrayBuffer(): Promise<ArrayBuffer>
}

export interface ClientBundle {
    client: AxiosInstance
    limiter: Bottleneck
    // eslint-disable-next-line no-unused-vars
    fetch: (url: string, init?: HttpFetchInit) => Promise<HttpFetchResponse>
}

// Create a configurable http client bundle
export function createHttpClient(opts?: HttpClientOptions): ClientBundle {
    const limiter = new Bottleneck({
        minTime: opts?.minTime ?? 200,
        maxConcurrent: opts?.maxConcurrent ?? 5,
    })

    const axiosConfig: AxiosRequestConfig = {
        baseURL: opts?.baseURL,
        timeout: opts?.timeout ?? 30000,
        headers: opts?.headers ?? {},
        maxContentLength: opts?.maxContentLength,
        maxBodyLength: opts?.maxBodyLength,
    }

    const client = axios.create(axiosConfig)

    axiosRetry(client, {
        retries: typeof opts?.retries === 'number' ? opts.retries : 3,
        retryDelay: opts?.retryDelay ?? axiosRetry.exponentialDelay,
        retryCondition: (error) =>
            axiosRetry.isNetworkOrIdempotentRequestError(error) ||
            error.response?.status === 429,
    })

    const fetch = async (
        url: string,
        init?: HttpFetchInit
    ): Promise<HttpFetchResponse> => {
        const method = init?.method ?? 'GET'
        const timeout = init?.timeout ?? axiosConfig.timeout ?? 30000
        const responseType = init?.responseType ?? 'json'

        const resp = await limiter.schedule(() =>
            client.request({
                url,
                method,
                timeout,
                responseType:
                    responseType === 'json'
                        ? 'json'
                        : responseType === 'text'
                          ? 'text'
                          : 'arraybuffer',
                signal: init?.signal,
                headers: init?.headers,
                params: init?.params,
                validateStatus: () => true,
            })
        )

        const { data } = resp

        const headers: Record<string, string> = {}
        Object.entries(resp.headers ?? {}).forEach(([k, v]) => {
            headers[String(k).toLowerCase()] = Array.isArray(v)
                ? v.join(',')
                : String(v ?? '')
        })

        return {
            ok: resp.status >= 200 && resp.status < 300,
            status: resp.status,
            statusText: resp.statusText ?? '',
            data,
            headers,
            json: async <T = unknown>() => data as T,
            text: async () =>
                typeof data === 'string' ? data : JSON.stringify(data),
            arrayBuffer: async () => {
                const toArrayBuffer = (input: unknown): ArrayBuffer => {
                    if (
                        typeof ArrayBuffer !== 'undefined' &&
                        input instanceof ArrayBuffer
                    ) {
                        return input
                    }
                    if (
                        typeof SharedArrayBuffer !== 'undefined' &&
                        input instanceof SharedArrayBuffer
                    ) {
                        const view = new Uint8Array(input as ArrayBufferLike)
                        const copy = new Uint8Array(view.length)
                        copy.set(view)
                        return copy.buffer
                    }
                    if (Buffer.isBuffer(input)) {
                        const copy = Uint8Array.from(input)
                        return copy.buffer
                    }
                    const str =
                        typeof input === 'string'
                            ? input
                            : JSON.stringify(input)
                    const buf = Buffer.from(str)
                    const copy = Uint8Array.from(buf)
                    return copy.buffer
                }

                if (responseType === 'arraybuffer' && resp.data !== undefined) {
                    return toArrayBuffer(resp.data)
                }

                return toArrayBuffer(data)
            },
        }
    }

    return { client, limiter, fetch }
}

// Default shared client (convenience)
export const {
    client: httpClient,
    limiter: httpLimiter,
    fetch: httpFetch,
} = createHttpClient()
