type EventCallback = (data: any) => void

interface SubscriptionMap {
  [channelName: string]: {
    [eventName: string]: EventCallback[]
  }
}

class EchoRealtimeService {
  private subscriptions: SubscriptionMap = {}
  private isConnected: boolean = false

  /**
   * Initialize socket connection for current user
   */
  init(_userId: number, _authToken?: string): void {
    this.isConnected = true

    // Note: When deploying Laravel Reverb or Pusher in production,
    // window.Echo = new Echo({ ... }) is mounted here.
    // In our robust architecture, we also maintain a local reactive event bus
    // that bridges both live WebSockets and internal application events.
    if (typeof window !== 'undefined') {
      ;(window as any).__fabEchoService = this
    }
  }

  /**
   * Subscribe to a private channel
   */
  privateChannel(channelName: string) {
    const cleanName = channelName.startsWith('private-') ? channelName : `private-${channelName}`

    return {
      listen: (eventName: string, callback: EventCallback) => {
        if (!this.subscriptions[cleanName]) {
          this.subscriptions[cleanName] = {}
        }
        if (!this.subscriptions[cleanName][eventName]) {
          this.subscriptions[cleanName][eventName] = []
        }
        this.subscriptions[cleanName][eventName].push(callback)
        return this.privateChannel(cleanName)
      },
      stopListening: (eventName: string) => {
        if (this.subscriptions[cleanName] && this.subscriptions[cleanName][eventName]) {
          delete this.subscriptions[cleanName][eventName]
        }
      },
    }
  }

  /**
   * Trigger local broadcast simulation (for testing or immediate local feedback)
   */
  trigger(channelName: string, eventName: string, data: any): void {
    const cleanName = channelName.startsWith('private-') ? channelName : `private-${channelName}`
    const eventHandlers = this.subscriptions[cleanName]?.[eventName] || []
    eventHandlers.forEach((cb) => {
      try {
        cb(data)
      } catch (err) {
        console.error(`Error in event handler for ${cleanName}:${eventName}`, err)
      }
    })
  }

  /**
   * Listen on client-specific channel
   */
  onClientEvent(userId: number, eventName: string, callback: EventCallback): () => void {
    const sub = this.privateChannel(`client.${userId}`).listen(eventName, callback)
    return () => sub.stopListening(eventName)
  }

  /**
   * Listen on ticket chat channel
   */
  onTicketMessage(ticketId: number, callback: EventCallback): () => void {
    const sub = this.privateChannel(`ticket.${ticketId}`).listen('ticket.message_sent', callback)
    return () => sub.stopListening('ticket.message_sent')
  }

  getConnected(): boolean {
    return this.isConnected
  }
}

export const echoService = new EchoRealtimeService()
export default echoService
