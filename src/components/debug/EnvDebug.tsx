'use client';

import React, { useState } from 'react';
import { regenerateFCMToken } from '@/config/firebase';

export default function EnvDebug() {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationResult, setRegenerationResult] = useState<string | null>(null);

  const handleRegenerateToken = async () => {
    setIsRegenerating(true);
    setRegenerationResult(null);

    try {
      const newToken = await regenerateFCMToken();
      if (newToken) {
        setRegenerationResult('✅ FCM token regenerated successfully! Try making a call now.');
      } else {
        setRegenerationResult('❌ Token regeneration failed. Check console for details.');
      }
    } catch (error: any) {
      setRegenerationResult(`❌ Error: ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded border m-4">
      <h3 className="font-bold mb-2">FCM Debug & Token Management</h3>

      {/* Token Regeneration Section */}
      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <h4 className="font-semibold mb-2">FCM Token Regeneration</h4>
        <p className="text-sm mb-3 text-gray-700">
          If you're not receiving call notifications, regenerate your FCM token.
        </p>
        <button
          onClick={handleRegenerateToken}
          disabled={isRegenerating}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
        >
          {isRegenerating ? '🔄 Regenerating...' : '🔄 Regenerate FCM Token'}
        </button>
        {regenerationResult && (
          <div className={`mt-2 p-2 rounded text-sm ${
            regenerationResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {regenerationResult}
          </div>
        )}
      </div>

      {/* Environment Variables Section */}
      <div className="space-y-2 text-sm">
        <div>
          <strong>NEXT_PUBLIC_FIREBASE_VAPID_KEY:</strong>
          <span className="ml-2 font-mono">
            {vapidKey ? `${vapidKey.substring(0, 20)}...` : 'NOT FOUND'}
          </span>
        </div>
        <div>
          <strong>Length:</strong>
          <span className="ml-2">{vapidKey?.length || 0} characters</span>
        </div>
        <div>
          <strong>Type:</strong>
          <span className="ml-2">{typeof vapidKey}</span>
        </div>
        <div>
          <strong>All NEXT_PUBLIC_ vars:</strong>
          <pre className="bg-white p-2 rounded mt-1 text-xs overflow-auto max-h-40">
            {JSON.stringify(
              Object.keys(process.env)
                .filter(key => key.startsWith('NEXT_PUBLIC_'))
                .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {}),
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}