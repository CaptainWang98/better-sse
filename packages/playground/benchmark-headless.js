/**
 * Run SSE performance benchmark using Puppeteer headless browser
 */

import puppeteer from 'puppeteer'
import { readFile, writeFile, unlink } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Test configuration
const TEST_CONFIG = {
  processingTime: 500,  // Message processing time (ms)
  duration: 20,         // Test duration (seconds)
  sampleInterval: 500,  // Sampling interval (ms)
  serverUrl: 'http://localhost:3000/events'
}

console.log('🔬 启动 SSE 性能基准测试')
console.log('='.repeat(80))
console.log(`📊 测试配置:`)
console.log(`  - 消息处理时间: ${TEST_CONFIG.processingTime}ms/条`)
console.log(`  - 测试时长: ${TEST_CONFIG.duration}秒`)
console.log(`  - 采样间隔: ${TEST_CONFIG.sampleInterval}ms`)
console.log(`  - 服务器地址: ${TEST_CONFIG.serverUrl}`)
console.log('='.repeat(80))

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox', 
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--allow-file-access-from-files'
  ]
})

try {
  const page = await browser.newPage()
  
  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 })
  
  // Listen to console output
  page.on('console', msg => {
    const text = msg.text()
    if (text.startsWith('[BENCHMARK]')) {
      console.log(text.replace('[BENCHMARK]', ''))
    }
  })
  
  // Listen to page errors
  page.on('pageerror', error => {
    console.error('❌ 页面错误:', error.message)
  })
  
  console.log('\n📄 加载测试环境...\n')
  
  // Read test code
  const benchmarkTestCode = await readFile(
    resolve(__dirname, 'benchmark-test.js'),
    'utf-8'
  )
  
  // Create temporary HTML file
  const testHtmlPath = resolve(__dirname, 'benchmark-temp.html')
  const testHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SSE Benchmark</title>
</head>
<body>
  <h1>Running Benchmark...</h1>
  <script>
    window.TEST_CONFIG = ${JSON.stringify(TEST_CONFIG)}
  </script>
  <script type="module">
    // Import BetterSSE
    import { useSSEStream } from '../better-sse/dist/index.js'
    
    ${benchmarkTestCode}
    
    // Start test
    runBenchmark(window.TEST_CONFIG, useSSEStream)
      .then(results => {
        window.benchmarkComplete = true
        window.benchmarkResults = results
      })
      .catch(error => {
        console.error('[BENCHMARK] ❌ 测试失败:', error)
        window.benchmarkComplete = true
        window.benchmarkError = error
      })
  </script>
</body>
</html>`
  
  // Write temporary file
  await writeFile(testHtmlPath, testHtmlContent)
  
  // Use file:// protocol (CORS check disabled)
  await page.goto(`file:///${testHtmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' })
  
  // Wait for test to complete
  console.log('⏳ 等待测试完成...\n')
  
  await page.waitForFunction(() => window.benchmarkComplete, {
    timeout: (TEST_CONFIG.duration + 10) * 1000
  })
  
  // Check for errors
  const hasError = await page.evaluate(() => !!window.benchmarkError)
  if (hasError) {
    const error = await page.evaluate(() => window.benchmarkError.message)
    console.error('\n❌ 测试执行失败:', error)
    await unlink(testHtmlPath).catch(() => {})
    process.exit(1)
  }
  
  console.log('\n✅ 所有测试完成\n')
  
  // Clean up temporary file
  await unlink(testHtmlPath).catch(() => {})
  
} catch (error) {
  console.error('\n❌ 基准测试失败:', error.message)
  process.exit(1)
} finally {
  await browser.close()
  process.exit(0)
}
