import { useState, useEffect } from 'react';
import {
  getSubscriptionStatus,
  SubscriptionStatusResponse,
  SubscriptionPlan
} from '@/api/subscription';

export const useSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const data = await getSubscriptionStatus();
      setSubscriptionData(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const hasCallingAccess = (): boolean => {
    return subscriptionData?.features?.calling?.hasAccess || false;
  };

  const isPaidUser = (): boolean => {
    return subscriptionData?.tier !== 'free';
  };

  const getTier = (): SubscriptionPlan => {
    return subscriptionData?.tier || 'free';
  };

  const refetch = () => {
    fetchSubscriptionStatus();
  };

  return {
    subscriptionData,
    loading,
    error,
    hasCallingAccess,
    isPaidUser,
    getTier,
    refetch
  };
};
