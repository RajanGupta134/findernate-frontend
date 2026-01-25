// components/Signup/OTPStep.jsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VerifyOtp } from '@/api/auth';
import axios from 'axios';
import { useUserStore } from '@/store/useUserStore';



const OTPStep = () => {
  const [otp, setOtp] = useState(Array(6).fill(''));
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();
  // //console.log(data);
  const {setUser, setToken} = useUserStore();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Update parent data
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.join('').length === 6) {
     try{ 
      const  response = await VerifyOtp({ otp: otp.join('') })
      setUser(response.data.user);
      setToken(response.data.accessToken);
      // localStorage is handled automatically by setToken in the store
      router.push('/');
    } catch(err){
        if (axios.isAxiosError(err)) {
            setError(err.response?.data?.message || 'Signup failed');
        } else {
            setError('Signup failed');
        }
      }
    };
  }
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-white">
      <div className="max-w-md w-full">

        <h1 className="text-3xl font-bold text-gray-800 mb-2">OTP Verification</h1>
        <p className="text-gray-500 mb-6">Enter the 4-digit code sent to your phone</p>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete="off"
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-14 text-center text-xl text-black border border-gray-300 rounded-md placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="•"
              />
            ))}
          </div>

          <div className="text-center text-sm text-gray-600">
            Didn&apos;t receive any code?{' '}
            {timer > 0 ? (
              <span className="text-gray-800 font-medium">Resend in {formatTime(timer)}</span>
            ) : (
              <button
                type="button"
                className="text-yellow-600 font-medium hover:underline"
                onClick={() => setTimer(60)}
              >
                Resend
              </button>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-yellow-400 text-black font-semibold rounded-md hover:bg-yellow-500 transition"
          >
            Verify
          </button>

          {error && <p className="text-red-500">{error}</p>}
        </form>

        <div className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <a href="/signin" className="text-yellow-600 hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
};

export default OTPStep;