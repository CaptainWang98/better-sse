# BetterSSE Monorepo

A modern SSE (Server-Sent Events) client based on Fetch API

English | [中文](./README.zh-CN.md)

> ⚠️ **Development Warning**  
> This library is currently under development and may contain bugs and unstable APIs. **Not recommended for production use.**  
> Feel free to report issues via [Issues](https://github.com/your-repo/issues) or contribute code through [Pull Requests](https://github.com/your-repo/pulls)!

## ✨ Features

- [x] **Async Iterator Support** - Handle SSE messages elegantly with `for await...of`
- [x] **Auto Reconnection** - Automatic reconnection with exponential backoff strategy
- [x] **Resume from Breakpoint** - Resume connections using `Last-Event-ID`
- [x] **Manual Cancellation** - Support for actively aborting connections
- [x] **Backpressure Control** - Native backpressure support based on Web Streams API
- [x] **TypeScript** - Complete type definitions
- [x] **Standards Compliant** - Strictly follows [WHATWG SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html#eventsource)

## 📁 Project Structure

```
thottled-sse/
├── packages/
│   ├── better-sse/          # Core SSE library
│   │   ├── src/             # TypeScript source code
│   │   │   ├── index.ts           # Main entry, exports useSSEStream
│   │   │   ├── sse-stream.ts      # BetterSSEStream core implementation
│   │   │   ├── transforms.ts      # Transform streams (split, parse)
│   │   │   └── utils.ts           # Utility functions
│   │   ├── dist/            # Build output
│   │   └── package.json
│   └── playground/          # Testing and benchmarks
│       ├── server.js              # SSE test server
│       ├── benchmark-headless.js  # Headless browser performance test
│       ├── benchmark-test.js      # Test logic code
│       ├── benchmark-runner.html  # Browser performance test page
│       └── package.json
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # Workspace configuration
└── README.md
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build better-sse Package

```bash
pnpm build
```

### 3. Run Performance Benchmarks

#### Start Test Server (Terminal 1)

```bash
cd packages/playground
node server.js
```

Server will start at http://localhost:3000.

#### Run Headless Browser Test (Terminal 2)

```bash
cd packages/playground
node benchmark-headless.js
```

This will run a performance comparison between BetterSSE and EventSource, demonstrating the advantages of backpressure control.

#### Or Use Browser Visual Test

Open `packages/playground/benchmark-runner.html` in your browser to view real-time performance comparison.

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

## 📝 Available Scripts

### Root Directory

```bash
pnpm build          # Build better-sse package
pnpm dev            # Development mode (watch file changes)
pnpm clean          # Clean all build artifacts
```

### better-sse Package

```bash
cd packages/better-sse
pnpm build          # Build
pnpm dev            # Development mode (watch)
pnpm clean          # Clean
```

### playground Package

```bash
cd packages/playground
node server.js                    # Start test server
node benchmark-headless.js        # Run performance benchmark (server must be running)
# Or open benchmark-runner.html in browser for visual testing
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

## 📚 Documentation

- [better-sse API Documentation](./packages/better-sse/README.md) - Complete API reference
- [Performance Benchmarks](./packages/playground/) - BetterSSE vs EventSource performance comparison

## 🔄 Development Workflow

1. **Modify better-sse code**
   ```bash
   # Edit files in packages/better-sse/src/
   pnpm build  # Rebuild
   ```

2. **Test changes**
   ```bash
   cd packages/playground
   node server.js              # Start server
   node benchmark-headless.js  # Run tests
   ```

3. **Use watch mode**
   ```bash
   pnpm dev    # Auto watch and recompile
   ```

## 🌟 Comparison with Standard EventSource

| Feature | BetterSSE | EventSource |
|---------|-----------|-------------|
| Based on | Fetch API + Streams | XMLHttpRequest |
| Async Iterator | ✅ | ❌ |
| Backpressure Control | ✅ (Native support) | ❌ (Message buildup) |
| Custom Headers | ✅ | ❌ |
| AbortController | ✅ | ❌ |
| POST Requests | ✅ | ❌ |
| Reconnection Strategy | ✅ (Exponential backoff) | ⚠️ (Fixed 3s) |
| Memory Efficiency | ✅ (Zero queue) | ❌ (May OOM) |
| TypeScript | ✅ | ⚠️ (Partial) |

## 🛠️ Tech Stack

- **Language**: TypeScript
- **Module System**: ESM (ES Modules)
- **Package Manager**: pnpm workspace
- **Build Tool**: TypeScript Compiler (tsc)
- **Runtime**: Node.js / Browser

## 📦 Publishing

To publish better-sse to npm:

```bash
cd packages/better-sse
pnpm build
npm publish
```

## 📄 License

ISC

---

**Note**: This is a monorepo project managed with pnpm workspace. The playground package references the local better-sse package via `workspace:*` protocol, ensuring it always uses the latest build artifacts.
