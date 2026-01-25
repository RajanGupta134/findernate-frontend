'use client'
import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Input from './ui/Input';
import { sendResetOtp } from '@/api/auth';
import { Button } from './ui/button';
import ResetPasswordComponent from './ResetPassword';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPasswordComponent: React.FC = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(value)) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'email') validateEmail(value);
    setError(''); // Clear general error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(formData.email)) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendResetOtp({ email: formData.email });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Image
            src="/Findernate.ico"
            alt="FinderNate Logo"
            width={40}
            height={40}
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h1>
        <p className="text-gray-600">No worries, we&apos;ll send you reset instructions</p>
      </div>

      {/* Success Message */}
      {isSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                OTP sent successfully!
              </p>
              <p className="text-xs text-green-600">
                Check your email at <span className="font-semibold">{formData.email}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show Reset Password Component if OTP is sent */}
      {isSuccess ? (
        <ResetPasswordComponent email={formData.email} />
      ) : (
        <>
          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <Input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={(e) => validateEmail(e.target.value)}
                leftIcon={<Mail className="w-5 h-5" />}
                error={emailError}
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="custom"
              disabled={isLoading || !!emailError || !formData.email}
              className="w-full bg-button-gradient text-black py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending OTP...
                </div>
              ) : (
                'Send OTP'
              )}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/signin"
              className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default ForgotPasswordComponent;
