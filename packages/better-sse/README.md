# BetterSSE

一个基于 Fetch API 的增强型 SSE (Server-Sent Events) 客户端库，完全遵循 [WHATWG SSE 标准规范](https://html.spec.whatwg.org/multipage/server-sent-events.html#eventsource)。

## 特性

- ✅ **异步迭代器支持** - 使用 `for await...of` 优雅地处理 SSE 消息
- ✅ **自动重连** - 支持指数退避策略的自动重连
- ✅ **断点续传** - 使用 `Last-Event-ID` 从断开处恢复连接
- ✅ **手动取消** - 支持主动中止连接
- ✅ **节流控制** - 支持分段返回或逐消息返回
- ✅ **完整的事件回调** - onOpen, onMessage, onError, onClose
- ✅ **TypeScript** - 完整的类型定义
- ✅ **标准兼容** - 严格遵循 SSE 标准规范

## 安装

```bash
npm install throttled-sse
# 或
pnpm add throttled-sse
# 或
yarn add throttled-sse
```

## 基本使用

### 使用异步迭代器

```typescript
import { BetterSSE } from 'throttled-sse'

const sse = new BetterSSE({
  url: 'https://example.com/events',
})

// 使用 for await...of 读取消息
for await (const message of sse) {
  console.log('Event:', message.event)
  console.log('Data:', message.data)
  console.log('ID:', message.id)
}
```

### 使用事件回调

```typescript
const sse = new BetterSSE({
  url: 'https://example.com/events',
  onOpen: () => {
    console.log('连接已建立')
  },
  onMessage: (message) => {
    console.log('收到消息:', message.data)
  },
  onError: (error) => {
    console.error('连接错误:', error)
  },
  onClose: () => {
    console.log('连接已关闭')
  },
})

// 启动连接
for await (const message of sse) {
  // 处理消息
}
```

### 手动取消连接

```typescript
const sse = new BetterSSE({
  url: 'https://example.com/events',
})

// 在某个时刻取消连接
setTimeout(() => {
  sse.abort()
}, 10000)

for await (const message of sse) {
  console.log(message.data)
}
```

### 使用自定义 AbortController

```typescript
const controller = new AbortController()

const sse = new BetterSSE({
  url: 'https://example.com/events',
  abortController: controller,
})

// 从外部取消
setTimeout(() => {
  controller.abort()
}, 5000)

for await (const message of sse) {
  console.log(message.data)
}
```

## 配置选项

```typescript
interface SSEOptions {
  /** SSE 端点 URL */
  url: string | URL
  
  /** 是否发送凭据（cookies），默认 false */
  withCredentials?: boolean
  
  /** 用于中止请求的控制器 */
  abortController?: AbortController
  
  /** 是否启用节流（分段返回），默认 true */
  throttled?: boolean
  
  /** 是否启用自动重连策略（指数退避），默认 true */
  retryStrategy?: boolean
  
  /** 初始重连延迟时间（毫秒），默认 1000ms */
  initialRetryDelay?: number
  
  /** 最大重连延迟时间（毫秒），默认 30000ms */
  maxRetryDelay?: number
  
  /** 最大重试次数，默认 Infinity */
  maxRetries?: number
  
  /** 自定义请求头 */
  headers?: HeadersInit
  
  /** fetch 请求的额外选项 */
  fetchOptions?: RequestInit
  
  /** 连接建立时的回调 */
  onOpen?: () => void
  
  /** 收到消息时的回调 */
  onMessage?: (message: SSEMessage) => void
  
  /** 发生错误时的回调 */
  onError?: (error: Error) => void
  
  /** 连接关闭时的回调 */
  onClose?: () => void
}
```

## 消息格式

```typescript
interface SSEMessage {
  /** 事件类型，默认为 "message" */
  event: string
  
  /** 消息数据 */
  data: string
  
  /** 事件 ID，用于断线重连 */
  id?: string
  
  /** 重连延迟时间（毫秒） */
  retry?: number
}
```

## 高级用例

### 自动重连与断点续传

当启用 `retryStrategy` 时，库会自动处理重连，并使用 `Last-Event-ID` 头从断开处恢复：

```typescript
const sse = new BetterSSE({
  url: 'https://example.com/events',
  retryStrategy: true,
  initialRetryDelay: 1000,  // 初始延迟 1 秒
  maxRetryDelay: 30000,     // 最大延迟 30 秒
  maxRetries: 10,           // 最多重试 10 次
})

for await (const message of sse) {
  // 如果连接断开，会自动重连
  // 服务器会收到 Last-Event-ID 头，可以从该位置继续发送
  console.log(message.data)
}
```

### 处理不同类型的事件

```typescript
for await (const message of sse) {
  switch (message.event) {
    case 'message':
      console.log('普通消息:', message.data)
      break
    case 'update':
      console.log('更新消息:', message.data)
      break
    case 'notification':
      console.log('通知:', message.data)
      break
  }
}
```

### 带认证的请求

```typescript
const sse = new BetterSSE({
  url: 'https://example.com/events',
  withCredentials: true,
  headers: {
    'Authorization': 'Bearer your-token-here',
  },
})

for await (const message of sse) {
  console.log(message.data)
}
```

### 禁用节流（实时逐字返回）

```typescript
const sse = new BetterSSE({
  url: 'https://example.com/events',
  throttled: false,  // 禁用节流，立即返回每个数据块
})

for await (const message of sse) {
  console.log(message.data)
}
```

## 实现细节

### SSE 协议解析

库完全按照 WHATWG 标准实现了 SSE 协议的解析：

- 支持 `event`, `data`, `id`, `retry` 字段
- 正确处理多行 `data` 字段
- 支持注释行（以 `:` 开头）
- 严格的换行符处理（`\r\n`, `\r`, `\n`）
- 空行触发消息分发

### 重连策略

采用指数退避算法：

```
delay = min(initialDelay * 2^retryCount, maxDelay)
```

- 第 1 次重试: 1 秒
- 第 2 次重试: 2 秒
- 第 3 次重试: 4 秒
- ...
- 最大延迟: 30 秒

### 断点续传

当重连时，库会自动：
1. 记录最后收到的 `id` 字段
2. 在重连请求中添加 `Last-Event-ID` 请求头
3. 服务器可根据该 ID 从断开处继续发送数据

## 与标准 EventSource 的对比

| 特性 | BetterSSE | EventSource |
|------|-----------|-------------|
| 基于技术 | Fetch API | XMLHttpRequest |
| 异步迭代器 | ✅ | ❌ |
| 自定义请求头 | ✅ | ❌ |
| AbortController | ✅ | ❌ |
| 节流控制 | ✅ | ❌ |
| POST 请求 | ✅ | ❌ |
| 重连策略配置 | ✅ | ⚠️ (固定) |
| TypeScript | ✅ | ⚠️ (部分) |

## 浏览器兼容性

需要支持以下 API：
- Fetch API
- ReadableStream
- Async Iterators
- AbortController

现代浏览器均已支持，对于旧浏览器可使用相应的 polyfill。

## License

MIT
