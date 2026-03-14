'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export interface AgentLogMessage {
  type: 'agent_log'
  agent_name: string
  line: string
}

export interface AgentStartMessage {
  type: 'agent_start'
  agent_name: string
}

export interface AgentStopMessage {
  type: 'agent_stop'
  agent_name: string
}

export type OfficeWSMessage = AgentLogMessage | AgentStartMessage | AgentStopMessage

interface UseOfficeWebSocketProps {
  url?: string
  onMessage?: (msg: OfficeWSMessage) => void
}

export function useOfficeWebSocket({
  url = 'ws://localhost:8080/ws/office',
  onMessage
}: UseOfficeWebSocketProps = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onMessageRef = useRef(onMessage)

  // Keep ref fresh
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('Office WS connected')
      setIsConnected(true)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as OfficeWSMessage
        onMessageRef.current?.(data)
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onclose = () => {
      console.log('Office WS disconnected')
      setIsConnected(false)
      wsRef.current = null
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = (err) => {
      console.error('Office WS error:', err)
      ws.close()
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const runAgentTask = useCallback((agentName: string, prompt: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'run_agent',
        agent_name: agentName,
        prompt
      }))
    } else {
      console.warn('Cannot run agent task via WS, socket not open')
      // Fallback or retry logic
    }
  }, [])

  return { isConnected, runAgentTask }
}
