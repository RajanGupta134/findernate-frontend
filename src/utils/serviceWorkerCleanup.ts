// Service Worker Cleanup Utility
// This fixes the service worker conflict issue

export async function cleanupOldServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('❌ Service workers not supported');
    return;
  }

  try {
    console.log('🧹 Starting service worker cleanup...');

    // Get all registered service workers
    const registrations = await navigator.serviceWorker.getRegistrations();

    console.log(`📋 Found ${registrations.length} service worker(s)`);

    let removedCount = 0;
    let keptFirebase = false;

    for (const registration of registrations) {
      const swUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || 'unknown';
      console.log(`🔍 Checking: ${swUrl}`);

      // Keep only firebase-messaging-sw.js, remove all others
      if (swUrl.includes('firebase-messaging-sw.js')) {
        console.log(`✅ Keeping Firebase service worker: ${swUrl}`);
        keptFirebase = true;
      } else {
        console.log(`🗑️ Removing: ${swUrl}`);
        await registration.unregister();
        removedCount++;
      }
    }

    console.log(`\n✨ Cleanup complete!`);
    console.log(`   - Removed: ${removedCount} service worker(s)`);
    console.log(`   - Firebase SW active: ${keptFirebase ? 'Yes ✅' : 'No ❌'}`);

    if (!keptFirebase) {
      console.log(`\n⚠️ Firebase service worker not found. It will be registered on next page load.`);
    }

    console.log(`\n🔄 Please hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to complete cleanup.`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).cleanupOldServiceWorkers = cleanupOldServiceWorkers;
  console.log('💡 Tip: Run window.cleanupOldServiceWorkers() to fix service worker conflicts');
}
