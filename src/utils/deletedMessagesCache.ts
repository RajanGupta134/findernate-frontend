// Cache for tracking deleted messages state
// Uses localStorage to persist across page refreshes and sessions

interface DeletedMessageState {
  deletedForEveryone: boolean;
  deletedForEveryoneAt?: string;
}

const STORAGE_KEY = 'findernate_deleted_messages';
const MAX_ENTRIES = 500; // Limit storage size

class DeletedMessagesCache {
  private cache: Map<string, DeletedMessageState> = new Map();
  private initialized = false;

  constructor() {
    // Defer loading to avoid SSR issues
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  // Load cached data from localStorage - called synchronously when needed
  private loadFromStorage() {
    if (typeof window === 'undefined') {
      this.initialized = true;
      return;
    }

    if (this.initialized) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach(([key, value]: [string, DeletedMessageState]) => {
            this.cache.set(key, value);
          });
        }
      }
      this.initialized = true;
    } catch (e) {
      console.error('Failed to load deleted messages cache:', e);
      this.cache = new Map();
      this.initialized = true;
    }
  }

  // Ensure cache is loaded before any operation
  private ensureInitialized() {
    if (!this.initialized) {
      this.loadFromStorage();
    }
  }

  // Save cache to localStorage
  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      const entries = Array.from(this.cache.entries());
      // Keep only the most recent entries if too large
      const toStore = entries.slice(-MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('Failed to save deleted messages cache:', e);
    }
  }

  // Mark a message as deleted for everyone
  markDeleted(messageId: string, deletedAt?: string) {
    this.ensureInitialized();

    this.cache.set(messageId, {
      deletedForEveryone: true,
      deletedForEveryoneAt: deletedAt || new Date().toISOString()
    });

    // Clean up if cache is too large
    if (this.cache.size > MAX_ENTRIES) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, 100);
      keysToDelete.forEach(key => this.cache.delete(key));
    }

    this.saveToStorage();
  }

  // Remove deleted state (e.g., on revert after failed API call)
  removeDeleted(messageId: string) {
    this.ensureInitialized();

    this.cache.delete(messageId);
    this.saveToStorage();
  }

  // Get deleted state for a message
  getDeletedState(messageId: string): DeletedMessageState | undefined {
    this.ensureInitialized();
    return this.cache.get(messageId);
  }

  // Check if a message is marked as deleted
  isDeleted(messageId: string): boolean {
    this.ensureInitialized();
    return this.cache.has(messageId) && this.cache.get(messageId)!.deletedForEveryone;
  }

  // Apply deleted state to an array of messages
  applyToMessages<T extends { _id: string; deletedForEveryone?: boolean; deletedForEveryoneAt?: string }>(
    messages: T[]
  ): T[] {
    this.ensureInitialized();

    let hasNewEntries = false;

    const result = messages.map(msg => {
      const deletedState = this.cache.get(msg._id);
      if (deletedState) {
        return {
          ...msg,
          deletedForEveryone: deletedState.deletedForEveryone,
          deletedForEveryoneAt: deletedState.deletedForEveryoneAt
        };
      }
      // If the message comes with deletedForEveryone from API, store it
      if (msg.deletedForEveryone) {
        this.cache.set(msg._id, {
          deletedForEveryone: true,
          deletedForEveryoneAt: msg.deletedForEveryoneAt
        });
        hasNewEntries = true;
      }
      return msg;
    });

    // Save to storage if we added new entries
    if (hasNewEntries) {
      this.saveToStorage();
    }

    return result;
  }

  // Clear all cached state (e.g., on logout)
  clear() {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Clear state for a specific chat (when leaving a chat)
  clearChat(_chatId: string) {
    // Could be implemented if we track chatId -> messageId mapping
  }
}

// Export a singleton instance
export const deletedMessagesCache = new DeletedMessagesCache();
