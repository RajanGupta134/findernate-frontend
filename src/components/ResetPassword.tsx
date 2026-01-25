'use client'
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from './ui/Input';
import { resetPasswordWithOtp, sendResetOtp } from '@/api/auth';
import { useUserStore } from '@/store/useUserStore';

interface ResetPasswordFormData {
  otp: string;
  password: string;
  confirmPassword: string;
}

interface ResetPasswordComponentProps {
  email: string;
}

const ResetPasswordComponent: React.FC<ResetPasswordComponentProps> = ({ email }) => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    otp: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  
  const router = useRouter();
  const { setUser, setToken: setAuthToken } = useUserStore();

  const validateOtp = (value: string) => {
    if (!value) {
      setOtpError('OTP is required');
      return false;
    }
    if (!/^\d{6}$/.test(value)) {
      setOtpError('OTP must be 6 digits');
      return false;
    }
    setOtpError('');
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      setPasswordError('Password must contain uppercase, lowercase, and number');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (value !== formData.password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'otp') {
      validateOtp(value);
    }
    if (name === 'password') {
      validatePassword(value);
      // Re-validate confirm password if it exists
      if (formData.confirmPassword) {
        validateConfirmPassword(formData.confirmPassword);
      }
    }
    if (name === 'confirmPassword') {
      validateConfirmPassword(value);
    }
    setError(''); // Clear general error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isOtpValid = validateOtp(formData.otp);
    const isPasswordValid = validatePassword(formData.password);
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword);
    
    if (!isOtpValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await resetPasswordWithOtp({
        otp: formData.otp,
        newPassword: formData.password,
        confirmPassword: formData.confirmPassword
      });
      
      // Auto-login the user after successful password reset
      if (response.data.accessToken && response.data.user) {
        setUser(response.data.user);
        setAuthToken(response.data.accessToken);
        localStorage.setItem('token', response.data.accessToken);
      }
      
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = (err as any)?.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToHome = () => {
    router.push('/');
  };

  const handleResendOtp = async () => {
    if (!email || isResendingOtp) return;
    
    setIsResendingOtp(true);
    try {
      await sendResetOtp({ email });
      setError(''); // Clear any previous errors
      // You could show a success message here
    } catch (err: unknown) {
      const errorMessage = (err as any)?.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setError(errorMessage);
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Password Reset Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your password has been successfully reset. You are now logged in.
        </p>

        <button
          onClick={handleGoToHome}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-md"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Reset Password</h1>
        <p className="text-gray-600">Enter the OTP sent to your email and create a new password</p>
        <p className="text-sm text-gray-500 mt-1">OTP sent to: {email}</p>
      </div>

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* OTP Input */}
        <div>
          <Input
            type="text"
            name="otp"
            placeholder="Enter 6-digit OTP"
            value={formData.otp}
            onChange={handleInputChange}
            onBlur={(e) => validateOtp(e.target.value)}
            leftIcon={<Mail className="w-5 h-5" />}
            error={otpError}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            required
          />
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResendingOtp}
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResendingOtp ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Enter new password"
            value={formData.password}
            onChange={handleInputChange}
            onBlur={(e) => validatePassword(e.target.value)}
            leftIcon={<Lock className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
            error={passwordError}
            autoComplete="new-password"
            required
          />
          {formData.password && (
            <div className="mt-2 text-xs text-gray-500">
              Password requirements: 8+ characters, uppercase, lowercase, number
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            onBlur={(e) => validateConfirmPassword(e.target.value)}
            leftIcon={<Lock className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
            error={confirmPasswordError}
            autoComplete="new-password"
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
        <button
          type="submit"
          disabled={isLoading || !!otpError || !!passwordError || !!confirmPasswordError || !formData.otp || !formData.password || !formData.confirmPassword}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Resetting Password...
            </div>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          href="/signin"
          className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
        >
          Remember your password? Sign in
        </Link>
      </div>
    </>
  );
};

export default ResetPasswordComponent;
