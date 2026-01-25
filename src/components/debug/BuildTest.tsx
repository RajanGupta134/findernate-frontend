'use client';

import React from 'react';

// Simple test component to verify basic imports work
export const BuildTest: React.FC = () => {
  return (
    <div className="p-4 bg-green-100 border border-green-400 rounded-md">
      <h3 className="text-green-800 font-semibold">✅ Build Test Component</h3>
      <p className="text-green-700">This component loads successfully!</p>
      <p className="text-sm text-green-600">
        If you can see this, basic React imports are working.
      </p>
    </div>
  );
};
