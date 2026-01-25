'use client';

import { useParams } from 'next/navigation';
import FullScreenReelsViewer from '@/components/FullScreenReelsViewer';

/**
 * Full-screen reels viewer route
 * URL: /reels/watch/[reelId]
 *
 * This page provides a TikTok/Instagram-style full-screen video experience
 * with vertical scrolling, interaction controls, and video details.
 */
export default function WatchReelPage() {
  const params = useParams();
  const reelId = params.reelId as string;

  return <FullScreenReelsViewer initialReelId={reelId} />;
}
