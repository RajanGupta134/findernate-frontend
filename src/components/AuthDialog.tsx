'use client'
import React from 'react'
import { useRouter } from 'next/navigation'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose }) => {
  const router = useRouter()

  if (!isOpen) return null

  const handleSignIn = () => {
    onClose()
    setTimeout(() => {
      router.push('/signin')
    }, 100)
  }

  const handleSignUp = () => {
    onClose()
    setTimeout(() => {
      router.push('/signup')
    }, 100)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-[10000]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close dialog"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-yellow-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Login to Interact</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to like, comment, or create posts. Join our community today!
          </p>

          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full bg-yellow-500 text-black py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
            >
              Sign In
            </button>
            
            <button
              onClick={handleSignUp}
              className="w-full bg-white text-yellow-500 py-3 px-4 rounded-lg border-2 border-yellow-500 hover:bg-yellow-50 transition-colors font-medium"
            >
              Sign Up
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
