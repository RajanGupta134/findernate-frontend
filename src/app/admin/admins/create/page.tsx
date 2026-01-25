'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';
import { ArrowLeft, Save, User, Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function CreateAdminPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    permissions: {
      viewAnalytics: false,
      verifyAadhaar: false,
      manageReports: false,
      manageUsers: false,
      manageBusiness: false
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionChange = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission as keyof typeof prev.permissions]
      }
    }));
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Here you would call the API to create the admin
      //console.log('Creating admin with data:', formData);
      // API call would go here
    }
  };

  const permissionDescriptions = {
    viewAnalytics: {
      title: 'View Analytics',
      description: 'Access dashboard statistics and analytics data'
    },
    verifyAadhaar: {
      title: 'Verify Aadhaar',
      description: 'Review and approve/reject Aadhaar card verifications'
    },
    manageReports: {
      title: 'Manage Reports',
      description: 'Handle user reports and take appropriate actions'
    },
    manageUsers: {
      title: 'Manage Users',
      description: 'View and manage user accounts and their status'
    },
    manageBusiness: {
      title: 'Manage Business',
      description: 'Review and verify business accounts and documents'
    }
  };

  const selectedPermissionsCount = Object.values(formData.permissions).filter(Boolean).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/admins"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Admin</h1>
            <p className="text-gray-600 mt-2">
              Add a new administrator with specific permissions
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black ${
                    errors.fullName ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black ${
                    errors.username ? 'border-red-500' : 'border-gray-200'
                  }`}
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black ${
                      errors.email ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter email address"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Password Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Password Setup</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black ${
                      errors.password ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black placeholder-black ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Permissions</h2>
              </div>
              <span className="text-sm text-gray-600">
                {selectedPermissionsCount} of {Object.keys(formData.permissions).length} selected
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(permissionDescriptions).map(([key, { title, description }]) => (
                <div key={key} className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id={key}
                    checked={formData.permissions[key as keyof typeof formData.permissions]}
                    onChange={() => handlePermissionChange(key)}
                    className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor={key} className="block text-sm font-medium text-gray-900 cursor-pointer">
                      {title}
                    </label>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedPermissionsCount === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Note: Admin will be created without any permissions. You can assign permissions later.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin/admins"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors"
            >
              <Save className="h-4 w-4" />
              Create Admin
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}