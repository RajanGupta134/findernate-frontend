'use client'
import ResetPasswordComponent from '@/components/ResetPassword'
import { useSearchParams, useRouter } from 'next/navigation'
import React, { useEffect, useState, Suspense } from 'react'

const ResetPasswordContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // If no email parameter, redirect to forgot password page
      router.push('/forgot-password')
    }
  }, [searchParams, router])

  // Show loading or redirect if no email
  if (!email) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100'>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex justify-center items-center min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100'>
      <ResetPasswordComponent email={email} />
    </div>
  )
}

const ResetPasswordPage = () => {
  return (
    <Suspense fallback={
      <div className='flex justify-center items-center min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100'>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

export default ResetPasswordPage
