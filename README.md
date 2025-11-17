# BetterSSE

A modern SSE (Server-Sent Events) client based on Fetch API

English | [中文](./README.zh-CN.md)

> ⚠️ **Development Warning**  
> This library is currently under development and may contain bugs and unstable APIs. **Not recommended for production use.**  
> Feel free to report issues via [Issues](https://github.com/your-repo/issues) or contribute code through [Pull Requests](https://github.com/your-repo/pulls)!

## ✨ Features

- [x] **Async Iterator Support** - Handle SSE messages elegantly with `for await...of`
- [ ] **Auto Reconnection** - Automatic reconnection with exponential backoff strategy
- [ ] **Resume from Breakpoint** - Resume connections using `Last-Event-ID`
- [x] **Manual Cancellation** - Support for actively aborting connections
- [ ] **Plugin System** - Register plugins before/after requests to access data
- [x] **Backpressure Control** - Native backpressure support based on Web Streams API
- [ ] **TypeScript** - Complete type definitions
- [x] **Standards Compliant** - Strictly follows [WHATWG SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html#eventsource)

## 📖 Usage Examples

### Basic Usage

```javascript
import { useSSEStream } from 'better-sse'

const sse = useSSEStream({
  url: 'http://localhost:3000/events',
})

// Read messages using for await...of
for await (const message of sse) {
  console.log('Event:', message.event)
  console.log('Data:', message.data)
  console.log('ID:', message.id)
}
```

### Auto Reconnection

```javascript
const sse = useSSEStream({
  url: 'http://localhost:3000/events',
  retryStrategy: true,        // Enable auto reconnection
  initialRetryDelay: 1000,    // Initial delay 1 second
  maxRetryDelay: 30000,       // Max delay 30 seconds
  maxRetries: 10,             // Max retry attempts 10 times
})

for await (const message of sse) {
  console.log(message.data)
  // Will auto reconnect when connection drops
}
```

### Using AbortController

```javascript
const abortController = new AbortController()

const sse = useSSEStream({
  url: 'http://localhost:3000/events',
  abortController,
})

// Cancel connection after 10 seconds
setTimeout(() => abortController.abort(), 10000)

for await (const message of sse) {
  console.log(message.data)
}
```

### Resume from Breakpoint

```javascript
const sse = useSSEStream({
  url: 'http://localhost:3000/events',
  lastEventId: '42',  // Start receiving from event ID 42
})

for await (const message of sse) {
  console.log(message.data)
  // BetterSSE automatically saves and sends Last-Event-ID
}
```

## 🔧 Configuration Options

```typescript
interface SSEStreamOptions {
  url: string | URL                    // SSE endpoint URL
  withCredentials?: boolean            // Send credentials (cookies, default false)
  abortController?: AbortController    // Controller for aborting requests
  retryStrategy?: boolean              // Enable auto reconnection (default true)
  initialRetryDelay?: number           // Initial reconnection delay (default 1000ms)
  maxRetryDelay?: number               // Max reconnection delay (default 30000ms)
  maxRetries?: number                  // Max retry attempts (default Infinity)
  headers?: HeadersInit                // Custom request headers
  lastEventId?: string                 // Last-Event-ID for reconnection
}

interface SSEMessage {
  event: string                        // Event type, default is "message"
  data: string                         // Message data
  id?: string                          // Event ID for reconnection
  retry?: number                       // Reconnection delay time (milliseconds)
}
```
