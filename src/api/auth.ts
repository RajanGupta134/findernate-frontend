
import axios from './base';

export const signUp = async (data: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
  profileImageUrl?: string;
  location?: string
  link?: string;
}) => {
  const response = await axios.post('/users/register', data);
  return response.data;
};

export const VerifyOtp = async (data: {
  otp: string;
}) => {
  const response = await axios.post('/users/register/verify', data);
  return response.data;
};

export const login = async (data: {
  identifier: string; // Can be either email or username
  password: string;
}) => {
  // Determine if the identifier is an email or username
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isEmail = emailRegex.test(data.identifier);
  
  // Prepare the request data based on the identifier type
  const requestData = isEmail 
    ? { email: data.identifier, password: data.password }
    : { username: data.identifier, password: data.password };
  
  const response = await axios.post('/users/login', requestData);
  return response.data;
};


export const logout = async () => {
  const response = await axios.post('/users/logout');
  return response.data;
};

// Send Reset OTP - Send OTP to email for password reset
export const sendResetOtp = async (data: {
  email: string;
}) => {
  const response = await axios.post('/users/send-reset-otp', data);
  return response.data;
};

// Verify Reset OTP and Reset Password
export const resetPasswordWithOtp = async (data: {
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  const response = await axios.post('/users/reset-password', data);
  return response.data;
};