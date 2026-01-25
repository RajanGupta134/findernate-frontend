'use client'
import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'

export const useAuthGuard = () => {
  const { user, token } = useUserStore()
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!(user && token)

  useEffect(() => {
    // Give a small delay to allow store initialization
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const requireAuth = (callback?: () => void) => {
    if (isAuthenticated) {
      callback?.()
      return true
    } else {
      setShowAuthDialog(true)
      return false
    }
  }

  const closeAuthDialog = () => setShowAuthDialog(false)

  return { 
    requireAuth, 
    isAuthenticated, 
    showAuthDialog, 
    closeAuthDialog,
    isLoading
  }
}