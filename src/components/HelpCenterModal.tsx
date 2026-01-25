'use client'

import React, { useState } from 'react'
import { X, Send } from 'lucide-react'
import axios from '@/api/base'

interface HelpCenterModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Please login to submit feedback')
        setIsSubmitting(false)
        return
      }

      await axios.post('/feedback/submit', {
        message: message.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      setIsSuccess(true)
      setMessage('')
      
      // Auto close after 2 seconds
      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error('Error submitting feedback:', err)
      setError(err?.response?.data?.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetModal = () => {
    setMessage('')
    setError('')
    setIsSuccess(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl max-w-md w-full mx-4 relative max-h-[90vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Support</h2>
          <p className="text-gray-600 text-sm">
            Need help? We're here to assist you. Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Help Center Content */}
        <div className="px-6 pb-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Help</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>• <strong>Account Issues:</strong> Having trouble logging in or accessing your account?</p>
              <p>• <strong>Business Features:</strong> Questions about promoting your business or KYC?</p>
              <p>• <strong>Technical Problems:</strong> App crashes, bugs, or feature requests</p>
              <p>• <strong>General Support:</strong> Any other questions or feedback</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Your Message
              </label>
              <textarea
                id="message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe your issue or question in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black resize-none focus:outline-none focus:ring-2 focus:ring-[#ffd65c] focus:border-[#ffd65c] transition-colors"
                disabled={isSubmitting || isSuccess}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {isSuccess && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                Thank you! Your message has been sent successfully.
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isSuccess || !message.trim()}
              className="w-full bg-[#ffd65c] text-black py-3 px-4 rounded-lg font-medium hover:bg-[#e6c045] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}