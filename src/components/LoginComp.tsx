'use client'
import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/api/auth';
import axios from 'axios';
import { useUserStore } from '@/store/useUserStore';
import Input from './ui/Input';
import Image from 'next/image';

interface LoginFormData {
  identifier: string; // Can be either email or username
  password: string;
}


const LoginComponent: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const { setUser, setToken } = useUserStore();
  const router = useRouter();

  const validateIdentifier = (value: string) => {
    if (!value) {
      setIdentifierError('');
      return true;
    }
    // Check if it's an email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (emailRegex.test(value)) {
      setIdentifierError('');
      return true;
    }
    // Check if it's a valid username format (alphanumeric, underscores, hyphens, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (usernameRegex.test(value)) {
      setIdentifierError('');
      return true;
    }
    setIdentifierError('Enter a valid email address or username');
    return false;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'identifier') validateIdentifier(value);
  };

  const onCreateAccount = () => {
    router.push('/signup');
  }
  
  useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/';
  }
}, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIdentifier(formData.identifier)) return; // Block submit if invalid identifier
    setIsLoading(true);
    setError('')
    try {
      const response = await login(formData)
      const user = response.data.user
      const token = response.data.accessToken

      // Set token first - this handles localStorage automatically
      setToken(token);
      setUser(user);
      router.push('/');
    } catch (err) {
        if (axios.isAxiosError(err)) {
            setError(err.response?.data?.message || 'Login failed');
        } else {
            setError('Login failed');
        }
    }finally {
      setIsLoading(false);
    }
  };

  
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Image
              src="/Findernate.ico"
              alt="FinderNate Logo"
              width={40}
              height={40}
              priority // loads logo immediately, no lazy loading
              />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Findernate</h1>
          <p className="text-gray-600">Welcome back to your business network</p>
        </div>

  {/* Login Form */}
  <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <div className="relative">
              <Input
                type="text"
                name="identifier"
                placeholder="Email address or username"
                value={formData.identifier}
                onChange={handleInputChange}
                onBlur={(e) => validateIdentifier(e.target.value)}
                leftIcon={ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>}
                error={identifierError}
                autoComplete="username"
                inputMode="text"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                leftIcon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>}
                 required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              href="/forgot-password"
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-button-gradient text-black font-semibold rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

        </form>

        {/* Create Account Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don&apos;t have an account?{' '}
            <button 
              onClick={onCreateAccount}
              className="text-yellow-600 hover:text-yellow-700 font-medium hover:underline transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginComponent;