/**
 * Clear stale viewed requests from localStorage
 * Run this in the browser console to clean up any corrupted state
 */
(function clearViewedRequests() {
  const VIEWED_REQUESTS_KEY = 'viewed_message_requests';

  try {
    const removed = localStorage.removeItem(VIEWED_REQUESTS_KEY);
    console.log('✅ Successfully cleared viewed requests from localStorage');
    console.log('Please refresh the page to apply changes');
  } catch (error) {
    console.error('❌ Failed to clear viewed requests:', error);
  }
})();
