export interface ServerEvent {
  data: string
  event?: string
  id?: string
}

export class SseDecoder {
  private buffer = ''

  push(chunk: string): ServerEvent[] {
    this.buffer += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const events: ServerEvent[] = []
    let boundary = this.buffer.indexOf('\n\n')

    while (boundary >= 0) {
      const block = this.buffer.slice(0, boundary)
      this.buffer = this.buffer.slice(boundary + 2)
      const event = this.parseBlock(block)
      if (event) events.push(event)
      boundary = this.buffer.indexOf('\n\n')
    }

    return events
  }

  private parseBlock(block: string): ServerEvent | null {
    const data: string[] = []
    let event: string | undefined
    let id: string | undefined

    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue
      const separator = line.indexOf(':')
      const field = separator < 0 ? line : line.slice(0, separator)
      const rawValue = separator < 0 ? '' : line.slice(separator + 1)
      const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

      if (field === 'data') data.push(value)
      if (field === 'event') event = value
      if (field === 'id' && !value.includes('\0')) id = value
    }

    if (data.length === 0) return null
    return { data: data.join('\n'), event, id }
  }
}

