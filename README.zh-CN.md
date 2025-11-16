# BetterSSE Monorepo

基于 Fetch API 实现的增强型 SSE (Server-Sent Events) 客户端

[English](./README.md) | 中文

> ⚠️ **开发中警告**  
> 此库目前处于开发阶段，可能存在 bug 和不稳定的 API。**不建议在生产环境中使用。**  
> 欢迎通过 [Issues](https://github.com/your-repo/issues) 报告问题或提交 [Pull Requests](https://github.com/your-repo/pulls) 贡献代码！

## ✨ 特性

- [x] **异步迭代器支持** - 使用 `for await...of` 优雅地处理 SSE 消息
- [x] **自动重连** - 支持指数退避策略的自动重连
- [x] **断点续传** - 使用 `Last-Event-ID` 从断开处恢复连接
- [x] **手动取消** - 支持主动中止连接
- [x] **背压控制** - 基于 Web Streams API 的原生背压支持
- [x] **TypeScript** - 完整的类型定义
- [x] **标准兼容** - 严格遵循 [WHATWG SSE 标准规范](https://html.spec.whatwg.org/multipage/server-sent-events.html#eventsource)

## 📁 项目结构

```
thottled-sse/
├── packages/
│   ├── better-sse/          # 核心 SSE 库
│   │   ├── src/             # TypeScript 源代码
│   │   │   ├── index.ts           # 主入口，导出 useSSEStream
│   │   │   ├── sse-stream.ts      # BetterSSEStream 核心实现
│   │   │   ├── transforms.ts      # 转换流（分割、解析）
│   │   │   └── utils.ts           # 工具函数
│   │   ├── dist/            # 编译输出
│   │   └── package.json
│   └── playground/          # 测试和性能基准
│       ├── server.js              # SSE 测试服务器
│       ├── benchmark-headless.js  # 无头浏览器性能测试
│       ├── benchmark-test.js      # 测试逻辑代码
│       ├── benchmark-runner.html  # 浏览器性能测试页面
│       └── package.json
├── package.json             # 根 package.json
├── pnpm-workspace.yaml      # workspace 配置
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建 better-sse 包

```bash
pnpm build
```

### 3. 运行性能基准测试

#### 启动测试服务器（终端 1）

```bash
cd packages/playground
node server.js
```

服务器将在 http://localhost:3000 启动。

#### 运行无头浏览器测试（终端 2）

```bash
cd packages/playground
node benchmark-headless.js
```

这将运行 BetterSSE vs EventSource 的性能对比测试，展示背压控制的优势。

#### 或使用浏览器可视化测试

在浏览器中打开 `packages/playground/benchmark-runner.html` 查看实时性能对比。

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

## 📝 可用脚本

### 根目录

```bash
pnpm build          # 构建 better-sse 包
pnpm dev            # 开发模式（监听文件变化）
pnpm clean          # 清理所有构建产物
```

### better-sse 包

```bash
cd packages/better-sse
pnpm build          # 构建
pnpm dev            # 开发模式（监听）
pnpm clean          # 清理
```

### playground 包

```bash
cd packages/playground
node server.js                    # 启动测试服务器
node benchmark-headless.js        # 运行性能基准测试（需先启动服务器）
# 或在浏览器中打开 benchmark-runner.html 进行可视化测试
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

## 📚 文档

- [better-sse API 文档](./packages/better-sse/README.md) - 完整的 API 参考
- [性能基准测试](./packages/playground/) - BetterSSE vs EventSource 性能对比

## 🔄 开发工作流

1. **修改 better-sse 代码**
   ```bash
   # 编辑 packages/better-sse/src/ 中的文件
   pnpm build  # 重新构建
   ```

2. **测试更改**
   ```bash
   cd packages/playground
   node server.js              # 启动服务器
   node benchmark-headless.js  # 运行测试
   ```

3. **使用监听模式**
   ```bash
   pnpm dev    # 自动监听并重新编译
   ```

## 🌟 与标准 EventSource 的对比

| 特性 | BetterSSE | EventSource |
|------|-----------|-------------|
| 基于技术 | Fetch API + Streams | XMLHttpRequest |
| 异步迭代器 | ✅ | ❌ |
| 背压控制 | ✅ (原生支持) | ❌ (消息堆积) |
| 自定义请求头 | ✅ | ❌ |
| AbortController | ✅ | ❌ |
| POST 请求 | ✅ | ❌ |
| 重连策略配置 | ✅ (指数退避) | ⚠️ (固定 3秒) |
| 内存效率 | ✅ (零队列) | ❌ (可能 OOM) |
| TypeScript | ✅ | ⚠️ (部分) |

## 🛠️ 技术栈

- **语言**: TypeScript
- **模块系统**: ESM (ES Modules)
- **包管理**: pnpm workspace
- **构建工具**: TypeScript Compiler (tsc)
- **运行时**: Node.js / 浏览器

## 📦 发布

如果要发布 better-sse 到 npm：

```bash
cd packages/better-sse
pnpm build
npm publish
```

## 📄 License

ISC

---

**注意**: 这是一个 monorepo 项目，使用 pnpm workspace 管理。playground 包通过 `workspace:*` 协议引用本地的 better-sse 包，确保始终使用最新的构建产物。
