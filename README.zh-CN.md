# BetterSSE

基于 Fetch API 实现的增强型 SSE (Server-Sent Events) 客户端

[English](./README.md) | 中文

> ⚠️ **开发中警告**  
> 此库目前处于开发阶段，可能存在 bug 和不稳定的 API。**不建议在生产环境中使用。**  
> 欢迎通过 [Issues](https://github.com/your-repo/issues) 报告问题或提交 [Pull Requests](https://github.com/your-repo/pulls) 贡献代码！

## ✨ 特性

- [x] **异步迭代器支持** - 使用 `for await...of` 优雅地处理 SSE 消息
- [ ] **自动重连** - 支持指数退避策略的自动重连
- [ ] **断点续传** - 使用 `Last-Event-ID` 从断开处恢复连接
- [x] **手动取消** - 支持主动中止连接
- [ ] **插件系统** - 支持发送请求前后注册插件，访问数据
- [x] **背压控制** - 基于 Web Streams API 的原生背压支持
- [ ] **TypeScript** - 完整的类型定义
- [x] **标准兼容** - 严格遵循 [WHATWG SSE 标准规范](https://html.spec.whatwg.org/multipage/server-sent-events.html#eventsource)

## 📖 使用示例

### 基本使用

```javascript
import { useSSEStream } from 'better-sse'

const sse = useSSEStream({
  url: 'http://localhost:3000/events',
})

// 使用 for await...of 读取消息
for await (const message of sse) {
  console.log('Event:', message.event)
  console.log('Data:', message.data)
  console.log('ID:', message.id)
}
```

### 自动重连

```javascript
const sse = useSSEStream({
  url: 'http://localhost:3000/events',
  retryStrategy: true,        // 启用自动重连
  initialRetryDelay: 1000,    // 初始延迟 1 秒
  maxRetryDelay: 30000,       // 最大延迟 30 秒
  maxRetries: 10,             // 最多重试 10 次
})

for await (const message of sse) {
  console.log(message.data)
  // 连接断开时会自动重连
}
```

### 使用 AbortController 控制连接

```javascript
const abortController = new AbortController()

const sse = useSSEStream({
  url: 'http://localhost:3000/events',
  abortController,
})

// 10 秒后取消连接
setTimeout(() => abortController.abort(), 10000)

for await (const message of sse) {
  console.log(message.data)
}
```

### 断点续传

```javascript
const sse = useSSEStream({
  url: 'http://localhost:3000/events',
  lastEventId: '42',  // 从事件 ID 42 之后开始接收
})

for await (const message of sse) {
  console.log(message.data)
  // BetterSSE 会自动保存和发送 Last-Event-ID
}
```

## 🔧 配置选项

```typescript
interface SSEStreamOptions {
  url: string | URL                    // SSE 端点 URL
  withCredentials?: boolean            // 是否发送凭据（cookies，默认 false）
  abortController?: AbortController    // 用于中止请求的控制器
  retryStrategy?: boolean              // 是否启用自动重连（默认 true）
  initialRetryDelay?: number           // 初始重连延迟（默认 1000ms）
  maxRetryDelay?: number               // 最大重连延迟（默认 30000ms）
  maxRetries?: number                  // 最大重试次数（默认 Infinity）
  headers?: HeadersInit                // 自定义请求头
  lastEventId?: string                 // 断线重连时的 Last-Event-ID
}

interface SSEMessage {
  event: string                        // 事件类型，默认为 "message"
  data: string                         // 消息数据
  id?: string                          // 事件 ID，用于断线重连
  retry?: number                       // 重连延迟时间（毫秒）
}
```
