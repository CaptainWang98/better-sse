import { createParseStream, createSplitStream } from "./transforms.js"

/**
 * SSE Event Type
 */
export interface SSEMessage {
  /** Event type, defaults to "message" */
  event: string
  /** Message data */
  data: string
  /** Event ID, used for reconnection */
  id?: string
  /** Reconnection delay time (milliseconds) */
  retry?: number
}

/**
 * SSE Options
 */
export interface SSEStreamOptions {
  /** SSE endpoint URL */
  url: string | URL
  /** Whether to send credentials (cookies) */
  withCredentials?: boolean
  /** Controller for aborting requests */
  abortController?: AbortController
  /** Whether to enable auto reconnection strategy (exponential backoff) */
  retryStrategy?: boolean
  /** Initial reconnection delay time (milliseconds), defaults to 1000ms */
  initialRetryDelay?: number
  /** Max reconnection delay time (milliseconds), defaults to 30000ms */
  maxRetryDelay?: number
  /** Max retry attempts, defaults to Infinity */
  maxRetries?: number
  /** Custom request headers */
  headers?: HeadersInit
  /** Last-Event-ID for reconnection */
  lastEventId?: string
}

/**
 * readable SSE Stream with async iterator support
 */
type SSEReadableStream = ReadableStream<SSEMessage> & {
  [Symbol.asyncIterator]: () => AsyncGenerator<SSEMessage>
  reader?: ReadableStreamDefaultReader<SSEMessage>
}

/**
 * SSE client
 */
export class BetterSSEStream implements AsyncIterableIterator<SSEMessage> {
  private options: SSEStreamOptions
  private retryCount = 0
  private currentLastEventId: string | undefined
  private stream: SSEReadableStream | null = null
  private reader: ReadableStreamDefaultReader<SSEMessage> | null = null

  constructor(options: SSEStreamOptions) {
    this.options = options
    this.currentLastEventId = options.lastEventId
  }

  /**
   * establish connection to SSE endpoint
   */
  async connect(): Promise<void> {
    try {
      const url = this.options.url instanceof URL ? this.options.url : new URL(this.options.url)
      
      // construct request headers
      const headers = new Headers(this.options.headers)
      headers.set('Accept', 'text/event-stream')
      headers.set('Cache-Control', 'no-cache')
      
      // add Last-Event-ID header if available
      if (this.currentLastEventId) {
        headers.set('Last-Event-ID', this.currentLastEventId)
      }

      // start fetch request
      const response = await fetch(url, {
        headers,
        credentials: this.options.withCredentials ? 'include' : 'same-origin',
        signal: this.options.abortController?.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      // retry count reset
      this.retryCount = 0

      // pipe
      const decoderStream = new TextDecoderStream()
      const processedStream = response.body
        .pipeThrough(decoderStream)
        .pipeThrough(createSplitStream())
        .pipeThrough(createParseStream()) as SSEReadableStream

      // use the processed stream as iterable
      this.stream = processedStream as SSEReadableStream

      // Stream will be consumed when user calls [Symbol.asyncIterator]
    } catch (error) {
      if (error instanceof Error) {
        // If retry strategy is enabled, attempt to reconnect
        if (this.options.retryStrategy && this.shouldRetry()) {
          await this.reconnect()
        } else {
          throw error
        }
      }
    }
  }

  /**
   * Check if should retry
   */
  private shouldRetry(): boolean {
    const maxRetries = this.options.maxRetries ?? Infinity
    return this.retryCount < maxRetries
  }

  /**
   * Reconnect with exponential backoff
   */
  private async reconnect(): Promise<void> {
    this.retryCount++
    
    const initialDelay = this.options.initialRetryDelay ?? 1000
    const maxDelay = this.options.maxRetryDelay ?? 30000
    
    // Exponential backoff: delay = min(initialDelay * 2^retryCount, maxDelay)
    const delay = Math.min(
      initialDelay * Math.pow(2, this.retryCount - 1),
      maxDelay
    )

    // Check if already aborted
    if (this.options.abortController?.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    
    // Use abortController's signal to detect cancellation
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delay)
      
      const onAbort = () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      }
      
      this.options.abortController?.signal.addEventListener('abort', onAbort, { once: true })
    })
    
    await this.connect()
  }

  /**
   * Close connection
   */
  close(): void {
    this.options.abortController?.abort()
    this.reader?.cancel()
    this.stream = null
    this.reader = null
  }

  /**
   * Async iterator support
   * Returns itself to ensure only one consumer
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<SSEMessage> {
    return this
  }

  /**
   * Implement AsyncIterator.next()
   * Supports backpressure: when caller is slow, next() won't be called, upstream will wait automatically
   */
  async next(): Promise<IteratorResult<SSEMessage>> {
    if (!this.reader) {
      if (!this.stream) {
        await this.connect()
      }

      if (!this.stream) {
        throw new Error('Failed to establish connection')
      }

      this.reader = this.stream.getReader()
    }

    try {
      const { done, value } = await this.reader.read()
      
      if (done) {
        this.reader.releaseLock()
        this.reader = null
        
        // If stream ends and retry strategy is enabled, attempt to reconnect
        if (this.options.retryStrategy && this.shouldRetry()) {
          this.stream = null
          await this.reconnect()
          // Recursively call next() to continue reading
          return this.next()
        }
        
        return { done: true, value: undefined }
      }

      // Update lastEventId
      if (value.id) {
        this.currentLastEventId = value.id
      }

      return { done: false, value }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        // Attempt to reconnect
        if (this.options.retryStrategy && this.shouldRetry()) {
          // Release current reader
          if (this.reader) {
            try {
              this.reader.releaseLock()
            } catch {}
            this.reader = null
          }
          this.stream = null
          
          // Reconnect
          await this.reconnect()
          
          // Recursively call next() to continue reading
          return this.next()
        } else {
          this.reader?.releaseLock()
          this.reader = null
          return { done: true, value: undefined }
        }
      } else {
        this.reader?.releaseLock()
        this.reader = null
        return { done: true, value: undefined }
      }
    }
  }

  /**
   * Optional return method for early termination of iteration
   */
  async return(): Promise<IteratorResult<SSEMessage>> {
    if (this.reader) {
      await this.reader.cancel()
      this.reader.releaseLock()
      this.reader = null
    }
    return { done: true, value: undefined }
  }
}
