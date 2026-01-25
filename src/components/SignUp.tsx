'use client'
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Eye, EyeOff, Check, RefreshCw, ChevronDown, User, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { countryCodes } from '@/constants/uiItems';
import { signUp } from '@/api/auth';
import { getUsernameSuggestions } from '@/api/user';
import axios from 'axios';
import { Button } from './ui/button';
import Input from './ui/Input';
import { useUserStore } from '@/store/useUserStore';
import Image from 'next/image';

export default function SignupComponent() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    countryCode: '+91',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean>(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const {setUser, setToken} = useUserStore()
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced username checking function
  const checkUsernameWithSuggestions = useCallback(async (username: string) => {
    if (username.length < 3) {
      setUsernameSuggestions([]);
      setShowSuggestions(false);
      setUsernameAvailable(false);
      setUsernameMessage('');
      return;
    }

    try {
      setLoadingUsername(true);
      const response = await getUsernameSuggestions(username);
      
      setUsernameAvailable(response.isAvailable);
      setUsernameMessage(response.message);
      setUsernameSuggestions(response.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(false);
      setUsernameMessage('Error checking username availability');
      setUsernameSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingUsername(false);
    }
  }, []);

  const handleCountryCodeSelect = (code:string) => {
    setFormData(prev => ({
      ...prev,
      countryCode: code
    }));
    setShowCountryDropdown(false);
  };

  const selectedCountry = countryCodes.find(c => c.code === formData.countryCode);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError('');
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(value)) {
      setEmailError('Enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleInputChange = (e:React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Special handling for phone number: allow only digits and preserve country code
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: digitsOnly
      }));
      return;
    }
    // Special handling for username: allow only alphanumeric characters (letters and numbers)
    if (name === 'username') {
      // Allow only a-z, A-Z, and 0-9 (no special characters)
      const alphanumericOnly = value.replace(/[^a-zA-Z0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: alphanumericOnly
      }));

      // Clear existing timeout
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }

      // Set new timeout for debounced API call
      usernameTimeoutRef.current = setTimeout(() => {
        checkUsernameWithSuggestions(alphanumericOnly);
      }, 500); // 500ms delay

      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'email') validateEmail(value);
  };

  // Handle phone number input with suggestions (preserve country code)
  const handlePhoneNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/[^0-9]/g, '');
    
    // If the input starts with a country code (e.g., +91), extract it
    if (value.startsWith('+')) {
      const countryCodeMatch = value.match(/^\+(\d+)/);
      if (countryCodeMatch) {
        const countryCode = '+' + countryCodeMatch[1];
        const phoneNumber = digitsOnly.substring(countryCodeMatch[1].length);
        
        // Find and set the matching country code
        const matchingCountry = countryCodes.find(c => c.code === countryCode);
        if (matchingCountry) {
          setFormData(prev => ({
            ...prev,
            countryCode: countryCode,
            phoneNumber: phoneNumber
          }));
          return;
        }
      }
    }
    
    // Regular phone number input (just digits)
    setFormData(prev => ({
      ...prev,
      phoneNumber: digitsOnly
    }));
  };

  const checkUsernameAvailability = () => {
    checkUsernameWithSuggestions(formData.username);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      username: suggestion
    }));
    setShowSuggestions(false);
    setUsernameAvailable(true);
    setUsernameMessage('Available!');
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameTimeoutRef.current) {
        clearTimeout(usernameTimeoutRef.current);
      }
    };
  }, []);

  const handleSigninClick = () => {
    router.push('/signin')
  }

  const handleDateSelect = (date: Date) => {
    // Fix timezone issue by creating date in local timezone
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Create date string in YYYY-MM-DD format using local timezone
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setFormData(prev => ({ ...prev, dateOfBirth: dateString }));
    setShowDatePicker(false);
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const isSelectedDate = (date: Date) => {
    if (!formData.dateOfBirth) return false;
    
    // Create date string from the current date in local timezone
    const currentDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    return currentDateString === formData.dateOfBirth;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) return;
        setError('');
    try {
      const signupData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phoneNumber: formData.countryCode + formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender
      };
      const response = await signUp(signupData);
      //console.log(response);
      setUser(response.data.user);
      setToken(response.data.accessToken);
      // localStorage is handled automatically by setToken in the store
      router.push('/');
    } catch (err) {
        if (axios.isAxiosError(err)) {
            setError(err.response?.data?.message || 'Signup failed');
        } else {
            setError('Signup failed');
        }
    }
  };

  return (
    <>
    
    <div className="min-h-screen bg-gradient-to-br from-[#fefdf5] to-orange-50 flex items-center justify-center p-4" onClick={() => {
      setShowCountryDropdown(false);
      setShowDatePicker(false);
      setShowSuggestions(false);
    }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
          <p className="text-gray-600">Join India&apos;s premier business platform</p>
        </div>

  {/* Form */}
  <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Full Name */}
            <div className="relative">
              <Input
                type="text"
                name="fullName"
                placeholder="Full Name (e.g., Gajanan Sharma)"
                value={formData.fullName}
                onChange={handleInputChange}
                leftIcon={<User/>}
                required
              />
            </div>
         

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username (Your Profile URL)
            </label>
            <div className="relative">
              <Input
                type="text"
                name="username"
                placeholder="username"
                value={formData.username}
                onChange={handleInputChange}
                className='!mb-1'
                leftIcon={<User/>}
                required
              />
              <div className="absolute right-1 top-1 flex items-center space-x-2">
                {loadingUsername && (
                  <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {!loadingUsername && usernameAvailable && (
                  <Check className="w-5 h-5 text-green-500" />
                )}
                {!loadingUsername && formData.username.length >= 3 && !usernameAvailable && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <Button
                  variant='custom'
                  onClick={checkUsernameAvailability}
                  className="cursor-pointer text-gray-400 disabled:opacity-50"
                  disabled={loadingUsername}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingUsername ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            {/* Username Status Message */}
            {usernameMessage && (
              <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                {usernameMessage}
              </p>
            )}
            
            {/* Username Suggestions */}
            {showSuggestions && usernameSuggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {usernameSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-[#fff5d6] text-[#b8871f] hover:bg-[#ffe08a] transition-colors cursor-pointer border border-[#ffd65c]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-500 mt-2">
              Your profile will be available at: findernate.com/{formData.username || 'username'}
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute left-3 top-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <span>{selectedCountry?.country}</span>
                  <span>{selectedCountry?.code}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
                             <Input
                 type="tel"
                 name="phoneNumber"
                 placeholder="9876543210"
                 value={formData.phoneNumber}
                 onChange={handlePhoneNumberInput}
                 inputClassName='pl-25'
                 pattern="[0-9]*"
                 inputMode="numeric"
                 maxLength={15}
                 required
               />
              
              {/* Country Code Dropdown */}
              {showCountryDropdown && (
                <div className="absolute top-14 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  {countryCodes.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountryCodeSelect(country.code)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
                    >
                      <span className='text-gray-600'>{country.name}</span>
                      <span className="text-gray-500">{country.country} {country.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email */}
            <div className="relative">
              <Input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={(e) => validateEmail(e.target.value)}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                }
                error={emailError}
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

                                           {/* Date of Birth */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth
                        </label>
                        <div className="relative">
                          {/* Custom text input that triggers the date picker */}
                          <Input
                            type="text"
                            name="dateOfBirthDisplay"
                            placeholder="DOB"
                            value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : ''}
                            onChange={() => {}} // Read-only
                            leftIcon={<Calendar className="w-5 h-5" />}
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            readOnly
                            required
                          />
                          
                                                     {/* Custom Date Picker Dropdown */}
                           {showDatePicker && (
                             <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-20 p-6 min-w-[320px]">
                               <div className="flex items-center justify-between mb-4">
                                 <h3 className="text-base font-semibold text-gray-800">Select Date of Birth</h3>
                                 <button
                                   type="button"
                                   onClick={() => setShowDatePicker(false)}
                                   className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                 >
                                   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                   </svg>
                                 </button>
                               </div>
                               
                               {/* Month/Year Navigation */}
                               <div className="flex items-center justify-between mb-4">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const newDate = new Date(currentDate);
                                     newDate.setMonth(newDate.getMonth() - 1);
                                     setCurrentDate(newDate);
                                   }}
                                   className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                 >
                                   <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                   </svg>
                                 </button>
                                 
                                 <div className="flex items-center space-x-2">
                                   {/* Month Selection */}
                                   <select
                                     value={currentDate.getMonth()}
                                     onChange={(e) => {
                                       const newDate = new Date(currentDate);
                                       newDate.setMonth(parseInt(e.target.value));
                                       setCurrentDate(newDate);
                                     }}
                                     className="text-lg font-semibold text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer"
                                   >
                                     {[
                                       'January', 'February', 'March', 'April', 'May', 'June',
                                       'July', 'August', 'September', 'October', 'November', 'December'
                                     ].map((month, index) => (
                                       <option key={month} value={index} className="text-gray-800">
                                         {month}
                                       </option>
                                     ))}
                                   </select>
                                   
                                   {/* Year Selection */}
                                   <select
                                     value={currentDate.getFullYear()}
                                     onChange={(e) => {
                                       const newDate = new Date(currentDate);
                                       newDate.setFullYear(parseInt(e.target.value));
                                       setCurrentDate(newDate);
                                     }}
                                     className="text-lg font-semibold text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer"
                                   >
                                     {Array.from({ length: 101 }, (_, i) => {
                                       const year = new Date().getFullYear() - 100 + i;
                                       return (
                                         <option key={year} value={year} className="text-gray-800">
                                           {year}
                                         </option>
                                       );
                                     })}
                                   </select>
                                 </div>
                                 
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const newDate = new Date(currentDate);
                                     newDate.setMonth(newDate.getMonth() + 1);
                                     setCurrentDate(newDate);
                                   }}
                                   className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                 >
                                   <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                   </svg>
                                 </button>
                               </div>
                              
                                                             {/* Calendar Grid */}
                               <div className="grid grid-cols-7 gap-1 mb-3">
                                 {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                   <div key={day} className="text-xs text-center text-gray-500 py-1 font-medium">
                                     {day}
                                   </div>
                                 ))}
                                 {getCalendarDays().map((day, index) => (
                                   <button
                                     key={index}
                                     type="button"
                                     onClick={() => handleDateSelect(day)}
                                     disabled={day < new Date('1900-01-01') || day > new Date()}
                                     className={`
                                       p-2 text-xs rounded transition-all duration-200 font-medium
                                       ${isSelectedDate(day) 
                                         ? 'bg-[#ffd65c] text-black shadow-md' 
                                         : isToday(day) 
                                         ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-400' 
                                         : isCurrentMonth(day) 
                                         ? 'text-gray-900 hover:bg-gray-100' 
                                         : 'text-gray-400 hover:bg-gray-50'
                                       }
                                       ${day < new Date('1900-01-01') || day > new Date() 
                                         ? 'opacity-30 cursor-not-allowed' 
                                         : 'cursor-pointer'
                                       }
                                     `}
                                   >
                                     {day.getDate()}
                                   </button>
                                 ))}
                               </div>
                              
                                                             {/* Action Buttons */}
                               <div className="flex justify-between pt-3 border-t border-gray-100">
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setFormData(prev => ({ ...prev, dateOfBirth: '' }));
                                     setShowDatePicker(false);
                                   }}
                                   className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                                 >
                                   Clear
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const today = new Date();
                                     handleDateSelect(today);
                                   }}
                                   className="px-4 py-2 text-sm bg-[#ffd65c] text-black hover:bg-yellow-600 rounded-lg transition-colors font-medium"
                                 >
                                   Today
                                 </button>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gender
                        </label>
                        <div className="relative">
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent pl-12 bg-white text-black"
                            required
                          >
                            <option value="" className="text-black">Select gender</option>
                            <option value="male" className="text-black">Male</option>
                            <option value="female" className="text-black">Female</option>
                            <option value="other" className="text-black">Other</option>
                            <option value="prefer-not-to-say" className="text-black">Prefer not to say</option>
                          </select>
                          <div className="absolute left-3 top-3 text-gray-400">
                            <Users className="w-5 h-5" />
                          </div>
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
                leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

                   {/* confirm Password */}
          <div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder=" Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                leftIcon={ <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-button-gradient text-black font-semibold rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Create Account
          </button>
        </form>

        {/* Already have account */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button onClick={handleSigninClick} className="text-yellow-600 hover:text-yellow-700 font-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}