/**
 * Simple SSE test server
 * Run: node server.js
 */

import http from 'http'

const server = http.createServer((req, res) => {
  if (req.url === '/events') {
    const requestId = Math.random().toString(36).substring(2, 8)
    // Set SSE response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    })

    // Check Last-Event-ID to support resume from breakpoint
    const lastEventId = req.headers['last-event-id']
    let counter = lastEventId ? parseInt(lastEventId) + 1 : 1

    console.log(`New Connection - Last-Event-ID: ${lastEventId || '无'}`)

    // Send a message every second
    const interval = setInterval(() => {
      // Send different types of events
      if (counter % 5 === 0) {
        // Heartbeat event
        res.write(`event: heartbeat\n`)
        res.write(`data: ${requestId},ping\n`)
        res.write(`id: ${counter}\n\n`)
      } else if (counter % 3 === 0) {
        // Notification event
        res.write(`event: notification\n`)
        res.write(`data: {"type":"info","message":"${requestId},这是第 ${counter} 条通知"}\n`)
        res.write(`id: ${counter}\n\n`)
      } else {
        // Regular message
        res.write(`data: ${requestId},meg #${counter} - ${new Date().toISOString()}\n`)
        res.write(`id: ${counter}\n\n`)
      }

      console.log(`${requestId},发送消息 #${counter}`)
      counter++

      if (counter > 20) {
        clearInterval(interval)
        res.end()
        console.log('server end')
      }
    }, 200)

    req.on('close', () => {
      clearInterval(interval)
      console.log('client close')
    })

  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`SSE test server running on http://localhost:${PORT}`)
})
