// reference: https://github.com/element-plus-x/Element-Plus-X/blob/main/packages/core/src/hooks/useXStream.ts

import { SSEMessage } from "./sse-stream.js"
import { isValidString } from "./utils.js"

/**
 * TransformStream: Split stream by SSE message delimiter
 * Uses \n\n as message delimiter, buffers incomplete chunks
 */
export function createSplitStream(): TransformStream<string, string> {
  let buffer = ''

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk
      const parts = buffer.split('\n\n')
      // The last part might be incomplete, keep it in buffer
      for (const part of parts.slice(0, -1)) {
        if (isValidString(part)) {
          controller.enqueue(part)
        }
      }
      buffer = parts[parts.length - 1]
    },
    flush(controller) {
      // When stream ends, send remaining buffer
      if (isValidString(buffer)) {
        controller.enqueue(buffer)
      }
    },
  })
}

/**
 * TransformStream: Parse SSE fields
 * Parse each message chunk into SSEMessage object
 */
export function createParseStream(): TransformStream<string, SSEMessage> {
  return new TransformStream<string, SSEMessage>({
    transform(partChunk, controller) {
      const lines = partChunk.split('\n')
      let event = 'message'
      let data: string[] = []
      let id: string | undefined
      let retry: number | undefined

      for (const line of lines) {
        // Skip empty lines and comment lines
        if (!line || line.startsWith(':')) continue

        const colonIndex = line.indexOf(':')
        if (colonIndex === -1) {
          // Line without colon, ignore
          continue
        }

        const field = line.slice(0, colonIndex)
        let value = line.slice(colonIndex + 1)
        
        // If value starts with space, remove the first space (SSE spec)
        if (value.startsWith(' ')) {
          value = value.slice(1)
        }

        // Process fields
        switch (field) {
          case 'event':
            event = value
            break
          case 'data':
            data.push(value)
            break
          case 'id':
            if (!value.includes('\0')) {
              id = value
            }
            break
          case 'retry':
            const retryValue = Number.parseInt(value, 10)
            if (!Number.isNaN(retryValue)) {
              retry = retryValue
            }
            break
        }
      }

      // Only send message when there's data
      if (data.length > 0) {
        const message: SSEMessage = {
          event,
          data: data.join('\n'),
        }
        if (id !== undefined) {
          message.id = id
        }
        if (retry !== undefined) {
          message.retry = retry
        }
        controller.enqueue(message)
      }
    },
  })
}