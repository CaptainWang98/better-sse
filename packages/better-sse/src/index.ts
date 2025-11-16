import { BetterSSEStream, SSEStreamOptions } from './sse-stream.js'
export type { SSEStreamOptions } from './sse-stream.js'
export { BetterSSEStream } from './sse-stream.js'

/**
 * return a BetterSSEStream instance
 * simple example:
 * ```ts
 * const sse = useSSEStream({
 *  url: 'https://example.com/sse-endpoint',
 *  onMessage: (msg) => console.log(msg
 * )
 * 
 * @param options SSE Options
 * @returns BetterSSEStream
 */
export function useSSEStream(options: SSEStreamOptions): BetterSSEStream {
  if (!options.url) {
    throw new Error('SSE URL is required')
  }

  let url: URL;
  try {
    url = new URL(options.url)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('SSE URL must use http: or https: protocol')
    }
  } catch (error) {
    throw new Error(`Invalid SSE URL: ${options.url}`)
  }

  // default options
  const normalizedOptions: SSEStreamOptions = {
    url,
    withCredentials: options.withCredentials ?? false,
    retryStrategy: options.retryStrategy ?? true,
    initialRetryDelay: options.initialRetryDelay ?? 1000,
    maxRetryDelay: options.maxRetryDelay ?? 30000,
    maxRetries: options.maxRetries ?? Infinity,
    abortController: options.abortController,
    headers: options.headers,
    lastEventId: options.lastEventId,
  }

  // parameter validation
  if (normalizedOptions.initialRetryDelay! < 0) {
    throw new Error('initialRetryDelay must be non-negative')
  }

  if (normalizedOptions.maxRetryDelay! < normalizedOptions.initialRetryDelay!) {
    throw new Error('maxRetryDelay must be greater than or equal to initialRetryDelay')
  }

  if (normalizedOptions.maxRetries! < 0) {
    throw new Error('maxRetries must be non-negative')
  }

  return new BetterSSEStream(normalizedOptions)
}

