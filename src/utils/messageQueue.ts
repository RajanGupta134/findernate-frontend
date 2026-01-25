/**
 * Shared message queue for tracking pending optimistic messages
 * This ensures FIFO (first-in-first-out) matching when server responses arrive
 */

interface PendingMessage {
  tempId: string;
  chatId: string;
  content: string;
  timestamp: number;
}

class MessageQueue {
  private queue: PendingMessage[] = [];

  /**
   * Add a message to the pending queue
   */
  add(tempId: string, chatId: string, content: string) {
    this.queue.push({
      tempId,
      chatId,
      content,
      timestamp: Date.now()
    });
    // console.log('[MessageQueue] Added message to queue:', { tempId, chatId, queueLength: this.queue.length });
  }

  /**
   * Get and remove the first pending message for a specific chat
   * Returns null if no pending messages for this chat
   */
  dequeueForChat(chatId: string): PendingMessage | null {
    const index = this.queue.findIndex(msg => msg.chatId === chatId);
    if (index === -1) {
      return null;
    }

    const [message] = this.queue.splice(index, 1);
    // console.log('[MessageQueue] Dequeued message:', { tempId: message.tempId, chatId, remainingInQueue: this.queue.length });
    return message;
  }

  /**
   * Peek at the first pending message for a chat without removing it
   */
  peekForChat(chatId: string): PendingMessage | null {
    return this.queue.find(msg => msg.chatId === chatId) || null;
  }

  /**
   * Remove a specific message by tempId
   */
  remove(tempId: string): boolean {
    const index = this.queue.findIndex(msg => msg.tempId === tempId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      // console.log('[MessageQueue] Removed message by tempId:', tempId);
      return true;
    }
    return false;
  }

  /**
   * Get all pending messages for a specific chat
   */
  getPendingForChat(chatId: string): PendingMessage[] {
    return this.queue.filter(msg => msg.chatId === chatId);
  }

  /**
   * Clean up stale messages older than 2 minutes
   */
  cleanup() {
    const twoMinutesAgo = Date.now() - 120000;
    const beforeLength = this.queue.length;
    this.queue = this.queue.filter(msg => msg.timestamp > twoMinutesAgo);

    if (this.queue.length < beforeLength) {
      console.warn('[MessageQueue] Cleaned up', beforeLength - this.queue.length, 'stale messages');
    }
  }

  /**
   * Clear all pending messages for a specific chat
   */
  clearChat(chatId: string) {
    const beforeLength = this.queue.length;
    this.queue = this.queue.filter(msg => msg.chatId !== chatId);
    // console.log('[MessageQueue] Cleared chat queue:', { chatId, removed: beforeLength - this.queue.length });
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
}

// Export singleton instance
export const messageQueue = new MessageQueue();
