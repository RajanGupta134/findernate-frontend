'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, User, Clock, UserPlus, Users } from 'lucide-react';
import {
  getPendingFollowRequests,
  getSentFollowRequests,
  approveFollowRequest,
  rejectFollowRequest
} from '@/api/privacy';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface FollowRequest {
  _id: string;
  requesterId?: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  recipientId?: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  recipient?: {
    _id: string;
    username: string;
    fullName: string;
    profileImageUrl?: string;
  };
  createdAt: string;
  timestamp?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface FollowRequestManagerProps {
  className?: string;
}

const FollowRequestManager: React.FC<FollowRequestManagerProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [pendingRes, sentRes] = await Promise.all([
        getPendingFollowRequests(),
        getSentFollowRequests()
      ]);

      setPendingRequests(pendingRes?.data?.requests || []);
      setSentRequests(sentRes?.data?.requests || []);
    } catch (error: any) {
      console.error('Error fetching follow requests:', error);
      toast.error('Failed to load follow requests', {
        position: "top-right",
        autoClose: 3000,
      });
      // Set empty arrays to prevent undefined errors
      setPendingRequests([]);
      setSentRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requesterId: string) => {
    setProcessingIds(prev => new Set(prev).add(requesterId));
    try {
      await approveFollowRequest(requesterId);
      setPendingRequests(prev => prev.filter(req => req.requesterId?._id !== requesterId));
      toast.success('Follow request approved!', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requesterId);
        return newSet;
      });
    }
  };

  const handleReject = async (requesterId: string) => {
    setProcessingIds(prev => new Set(prev).add(requesterId));
    try {
      await rejectFollowRequest(requesterId);
      setPendingRequests(prev => prev.filter(req => req.requesterId?._id !== requesterId));
      toast.success('Follow request rejected', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requesterId);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const RequestCard: React.FC<{ request: FollowRequest; type: 'received' | 'sent' }> = ({ request, type }) => {
    // Normalize possible API shapes: sometimes fields can be objects or raw IDs
    const normalizeUser = (u: any) => {
      if (!u) return null;
      if (typeof u === 'string') {
        return { _id: u, username: u, fullName: 'Unknown User' };
      }
      return u;
    };

    const rawRequester = (request as any).requester || request.requesterId || (request as any).sender || (request as any).senderId;
    const rawRecipient = request.recipient || request.recipientId || (request as any).target || (request as any).targetId;

    const user = type === 'received' ? normalizeUser(rawRequester) : normalizeUser(rawRecipient);
    if (!user) return null;

    const requesterIdForActions = typeof request.requesterId === 'string'
      ? request.requesterId
      : request.requesterId?._id || (request as any).requester?._id || user._id;

    const isProcessing = requesterIdForActions ? processingIds.has(requesterIdForActions) : false;

    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 relative">
            {user.profileImageUrl ? (
              <Image
                src={user.profileImageUrl}
                alt={user.fullName}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-800">{user.fullName || 'User'}</h4>
            <p className="text-sm text-gray-500">@{user.username || user._id}</p>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              {formatTimeAgo(request.timestamp || request.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          {type === 'received' && (
            <>
              <button
                onClick={() => requesterIdForActions && handleApprove(requesterIdForActions)}
                disabled={!requesterIdForActions || isProcessing}
                className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => requesterIdForActions && handleReject(requesterIdForActions)}
                disabled={!requesterIdForActions || isProcessing}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {type === 'sent' && (
            <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
              Pending
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading follow requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <UserPlus className="w-5 h-5 mr-2" />
        Follow Requests
      </h3>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'received'
              ? 'text-yellow-600 border-b-2 border-yellow-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Received ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'sent'
              ? 'text-yellow-600 border-b-2 border-yellow-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sent ({sentRequests.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'received' && (
          <>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No pending follow requests</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <RequestCard key={request._id} request={request} type="received" />
              ))
            )}
          </>
        )}

        {activeTab === 'sent' && (
          <>
            {sentRequests.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No sent follow requests</p>
              </div>
            ) : (
              sentRequests.map((request) => (
                <RequestCard key={request._id} request={request} type="sent" />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FollowRequestManager;