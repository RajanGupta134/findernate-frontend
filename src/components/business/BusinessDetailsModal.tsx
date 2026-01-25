import { AddBusinessDetails, UpdateBusinessDetails, GetBusinessDetails } from "@/api/business";
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

const businessCategories = [
  'Technology & Software',
  'E-commerce & Retail',
  'Health & Wellness',
  'Education & Training',
  'Finance & Accounting',
  'Marketing & Advertising',
  'Real Estate',
  'Travel & Hospitality',
  'Food & Beverage',
  'Fashion & Apparel',
  'Automotive',
  'Construction & Engineering',
  'Legal & Consulting',
  'Entertainment & Media',
  'Art & Design',
  'Logistics & Transportation',
  'Agriculture & Farming',
  'Manufacturing & Industrial',
  'Non-profit & NGOs',
  'Telecommunications'
];

const socialMediaPlatforms = [
  'Facebook',
  'Instagram',
  'Twitter',
  'LinkedIn',
  'YouTube',
  'TikTok',
  'Snapchat',
  'Pinterest',
  'WhatsApp Business',
  'Telegram',
  'Discord',
  'Reddit',
  'Tumblr',
  'Behance',
  'Dribbble',
  'GitHub',
  'Medium',
  'Quora',
  'Clubhouse',
  'Twitch'
];

type SocialMedia = { platform: string; url: string };
type BusinessDetails = {
  businessName: string;
  businessType: string;
  description: string;
  tags: string[];
  category: string;
  contact: {
    phone: string;
    email: string;
    website: string;
    socialMedia: SocialMedia[];
  };
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  website: string;
  gstNumber: string;
  aadhaarNumber: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BusinessDetails) => void;
  isEdit?: boolean; // Simple boolean to determine if it's edit mode
};

const defaultData: BusinessDetails = {
  businessName: "",
  businessType: "",
  description: "",
  tags: [],
  category: "",
  contact: {
    phone: "",
    email: "",
    website: "",
    socialMedia: [{ platform: "", url: "" }],
  },
  location: {
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  },
  website: "",
  gstNumber: "",
  aadhaarNumber: "",
};

const BusinessDetailsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isEdit = false // Default to create mode
}) => {
  const [form, setForm] = useState<BusinessDetails>(defaultData);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSocialDropdowns, setShowSocialDropdowns] = useState<Record<number, boolean>>({});
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Fetch business details when in edit mode
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      if (isEdit && isOpen) {
        //console.log('🔄 Fetching business details...'); // Debug log
        setFetchingData(true);
        try {
          const response = await GetBusinessDetails();
          //console.log('📡 API Response:', response); // Debug log
          
          if (response && response.data && response.data.business) {
            const businessData = response.data.business; // Extract the actual business data
            //console.log('✅ Business data:', businessData); // Debug log
            
            // Map the API response to form structure
            const formData = {
              businessName: businessData.businessName || '',
              businessType: businessData.businessType || '',
              description: businessData.description || '',
              category: businessData.category || '',
              tags: Array.isArray(businessData.tags) ? businessData.tags : [],
              contact: {
                phone: businessData.contact?.phone || '',
                email: businessData.contact?.email || '',
                website: businessData.contact?.website || '',
                socialMedia: Array.isArray(businessData.contact?.socialMedia) 
                  ? businessData.contact.socialMedia 
                  : [{ platform: "", url: "" }],
              },
              location: {
                address: businessData.location?.address || '',
                city: businessData.location?.city || '',
                state: businessData.location?.state || '',
                country: businessData.location?.country || '',
                pincode: businessData.location?.pincode || '',
              },
              website: businessData.website || '',
              gstNumber: businessData.gstNumber || '',
              aadhaarNumber: businessData.aadhaarNumber || '',
            };
            
            //console.log('📝 Setting form data:', formData); // Debug log
            setForm(formData);
          } else {
            //console.log('❌ No business data in response'); // Debug log
          }
        } catch (error) {
          console.error('❌ Error fetching business details:', error);
          // You might want to show a toast/notification here
        } finally {
          setFetchingData(false);
        }
      } else {
        //console.log('⏸️ Not fetching - isEdit:', isEdit, 'isOpen:', isOpen); // Debug log
      }
    };

    fetchBusinessDetails();
  }, [isEdit, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setForm(defaultData);
      setTagInput("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith("location.")) {
      setForm((prev) => ({
        ...prev,
        location: { ...prev.location, [name.split(".")[1]]: value },
      }));
    } else if (name.startsWith("contact.")) {
      setForm((prev) => ({
        ...prev, 
        contact: { ...prev.contact, [name.split(".")[1]]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSocialChange = (idx: number, field: "platform" | "url", value: string) => {
    setForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        socialMedia: prev.contact.socialMedia.map((sm, i) =>
          i === idx ? { ...sm, [field]: value } : sm
        ),
      },
    }));
  };

  const handleSocialPlatformSelect = (idx: number, platform: string) => {
    handleSocialChange(idx, "platform", platform);
    setShowSocialDropdowns(prev => ({ ...prev, [idx]: false }));
  };

  const toggleSocialDropdown = (idx: number) => {
    setShowSocialDropdowns(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const addSocial = () => {
    setForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        socialMedia: [...prev.contact.socialMedia, { platform: "", url: "" }],
      },
    }));
  };

  const removeSocial = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        socialMedia: prev.contact.socialMedia.filter((_, i) => i !== idx),
      },
    }));
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && form.tags && !form.tags.includes(trimmedTag)) {
      setForm(prev => ({
        ...prev,
        tags: [...(prev.tags || []), trimmedTag]
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleCategorySelect = (category: string) => {
    setForm(prev => ({ ...prev, category }));
    setShowCategoryDropdown(false);
  };

  const handleGSTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase(); // Convert to uppercase first
    // Only allow uppercase letters and numbers, max 15 characters
    const filteredValue = value.replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setForm(prev => ({ ...prev, gstNumber: filteredValue }));
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    const limitedValue = value.slice(0, 12); // Limit to 12 digits
    
    // Format with spaces: XXXX XXXX XXXX
    let formattedValue = '';
    for (let i = 0; i < limitedValue.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += ' ';
      }
      formattedValue += limitedValue[i];
    }
    
    setForm(prev => ({ ...prev, aadhaarNumber: formattedValue }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    const limitedValue = value.slice(0, 10); // Limit to 10 digits for Indian numbers
    
    // Format as: XXXXX XXXXX
    let formattedValue = '';
    for (let i = 0; i < limitedValue.length; i++) {
      if (i === 5) {
        formattedValue += ' ';
      }
      formattedValue += limitedValue[i];
    }
    
    setForm(prev => ({
      ...prev,
      contact: { ...prev.contact, phone: formattedValue }
    }));
  };

  // Validation function
  const validateForm = () => {
    if (!form.businessName?.trim()) {
      toast.error('Business name is required', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }


    if (!form.category?.trim()) {
      toast.error('Business category is required', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }

    if (!form.description?.trim()) {
      toast.error('Business description is required', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      
      // Prepare form data with proper null handling for GST
      const formDataToSubmit = {
        ...form,
        gstNumber: form.gstNumber?.trim() || null,
        aadhaarNumber: form.aadhaarNumber?.trim() || null,
      };
      
      if (isEdit) {
        // Edit mode: PATCH API
         await UpdateBusinessDetails(formDataToSubmit);
      } else {
        // Create mode: Try POST API first, fallback to PATCH if business exists
        try {
           await AddBusinessDetails(formDataToSubmit);
        } catch (createError: any) {
          // Check if the error indicates business already exists
          const errorMessage = createError?.response?.data?.message || createError?.message || '';
          const isBusinessExistsError = errorMessage.toLowerCase().includes('business') && 
              (errorMessage.toLowerCase().includes('already exists') || 
               errorMessage.toLowerCase().includes('already present') ||
               errorMessage.toLowerCase().includes('duplicate') ||
               errorMessage.toLowerCase().includes('profile already exists'));
          
          if (isBusinessExistsError) {
            
            console.log('🔄 Business already exists, falling back to update API...');
            
            // Show info toast about fallback
            toast.info('Business profile already exists. Updating existing details...', {
              position: "top-right",
              autoClose: 2000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
            
            // Fallback to update API
            await UpdateBusinessDetails(formDataToSubmit);
          } else {
            // Re-throw the original error if it's not a "business exists" error
            throw createError;
          }
        }
      }
      
      //console.log('Success:', response);
      
      // Show success toast
      const successMessage = isEdit 
        ? 'Business details updated successfully!' 
        : 'Business details submitted successfully!';
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      onClose(); // Close modal on success
      onSubmit(form);
      
    } catch (error: any) {
      console.error('Error:', error);
      
      // Show error toast
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit business details. Please try again.';
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Get modal title based on mode
  const getModalTitle = () => {
    return isEdit ? 'View/Edit Business Details' : 'Add Business Details';
  };

  // Get submit button text based on mode
  const getSubmitButtonText = () => {
    if (loading) return 'Saving...';
    return isEdit ? 'Update Business Details' : 'Submit Business Details';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header - Fixed at top */}
        <div className="bg-button-gradient px-8 py-6 relative flex-shrink-0">
          <button
            className="absolute top-4 right-4 text-black/80 hover:text-black hover:bg-black/20 rounded-full p-2 transition-all duration-200"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-3xl font-bold text-black mb-2">{getModalTitle()}</h2>
          <p className="text-black">
            {isEdit
              ? 'Update your business profile information'
              : 'Complete your business profile information'
            }
          </p>
        </div>

        {/* Form Content - Scrollable */}
        <div className="p-8 overflow-y-auto flex-1 hide-scrollbar">
          {fetchingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading business details...</span>
            </div>
          ) : (
            <div className="space-y-8">
            {/* Main Business Information - Top Priority Fields */}
            <div className="space-y-6">
              <div className="border-l-4 border-yellow-600 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Business Information</h3>
              </div>
              
              {/* Business Name and Website in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Business Name *</label>
                  <input 
                    name="businessName" 
                    value={form.businessName} 
                    onChange={handleChange} 
                    placeholder="Enter your business name" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                    required 
                  />
                  {!form.businessName?.trim() && (
                    <p className="text-sm text-yellow-600">Business name is required.</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input 
                    name="website" 
                    value={form.website} 
                    onChange={handleChange} 
                    placeholder="https://www.yourwebsite.com" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
              </div>
              
              {/* Category Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 text-left flex items-center justify-between"
                  >
                    <span className={form.category ? 'text-gray-800' : 'text-gray-500'}>
                      {form.category || 'Select a category'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCategoryDropdown && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowCategoryDropdown(false)}
                      />
                      
                      {/* Dropdown */}
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                        {businessCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleCategorySelect(category)}
                            className={`w-full text-left px-4 py-3 hover:bg-yellow-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              form.category === category ? 'bg-yellow-100 text-yellow-800 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Business Description */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Business Description *</label>
                <textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  placeholder="Describe your business, services, and what makes you unique..." 
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500 resize-none" 
                  required 
                />
              </div>
            </div>

            {/* Add More Details - Collapsible Section */}
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">Add More Details</h3>
                  <span className="text-sm text-gray-500">(Optional)</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showMoreDetails ? 'rotate-180' : ''}`} />
              </button>

              {showMoreDetails && (
                <div className="space-y-8 pl-4 border-l-2 border-gray-200">
                  {/* Business Type and Additional Info */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Business Type <span className="text-gray-500 text-sm">(Optional)</span></label>
                        <input 
                          name="businessType" 
                          value={form.businessType} 
                          onChange={handleChange} 
                          placeholder="e.g., LLC, Corporation, Partnership" 
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">GST Number</label>
                        <input 
                          name="gstNumber" 
                          value={form.gstNumber} 
                          onChange={handleGSTChange} 
                          placeholder="GST registration number (15 chars max)" 
                          maxLength={15}
                          style={{ textTransform: 'uppercase' }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                        />
                        <p className="text-xs text-gray-500">
                          Only uppercase letters and numbers allowed ({form.gstNumber.length}/15)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Aadhaar Number</label>
                        <input 
                          name="aadhaarNumber" 
                          value={form.aadhaarNumber} 
                          onChange={handleAadhaarChange} 
                          placeholder="XXXX XXXX XXXX (12 digits)" 
                          maxLength={14} // 12 digits + 2 spaces
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                        />
                        <p className="text-xs text-gray-500">
                          Only numbers allowed, auto-formatted ({form.aadhaarNumber.replace(/\s/g, '').length}/12 digits)
                        </p>
                      </div>
                    </div>

                    {/* Tags field - interactive tag system */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Tags</label>
                      
                      {/* Display existing tags */}
                      {form.tags && form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {form.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-2 text-yellow-600 hover:text-yellow-800 focus:outline-none"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Tag input */}
                      <div className="flex gap-2">
                        <input 
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={handleTagKeyPress}
                          placeholder="Type a tag and press Enter or comma" 
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          disabled={!tagInput.trim()}
                          className="px-4 py-2 text-sm font-medium text-black bg-button-gradient rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          Add
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        Press Enter or comma to add tags. Click × to remove tags.
                      </p>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div className="space-y-6">
                    <div className="border-l-4 border-yellow-600 pl-4">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h3>
                    </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input 
                    type="tel"
                    name="contact.phone" 
                    value={form.contact.phone} 
                    onChange={handlePhoneChange} 
                    placeholder="98765 43210 (10 digits)" 
                    maxLength={11} // 10 digits + 1 space
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                  <p className="text-xs text-gray-500">
                    Only numbers allowed, auto-formatted ({form.contact.phone.replace(/\s/g, '').length}/10 digits)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input 
                    name="contact.email" 
                    value={form.contact.email} 
                    onChange={handleChange} 
                    placeholder="contact@business.com" 
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
              </div>

              {/* Social Media Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Social Media</label>
                <div className="space-y-3">
                  {form.contact.socialMedia.map((sm, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => toggleSocialDropdown(idx)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 text-left flex items-center justify-between"
                          >
                            <span className={sm.platform ? 'text-gray-800' : 'text-gray-500'}>
                              {sm.platform || 'Select platform'}
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showSocialDropdowns[idx] ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {showSocialDropdowns[idx] && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowSocialDropdowns(prev => ({ ...prev, [idx]: false }))}
                              />
                              
                              {/* Dropdown */}
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                {socialMediaPlatforms.map((platform) => (
                                  <button
                                    key={platform}
                                    type="button"
                                    onClick={() => handleSocialPlatformSelect(idx, platform)}
                                    className={`w-full text-left px-4 py-3 hover:bg-yellow-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                      sm.platform === platform ? 'bg-yellow-100 text-yellow-800 font-medium' : 'text-gray-700'
                                    }`}
                                  >
                                    {platform}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          value={sm.url}
                          onChange={e => handleSocialChange(idx, "url", e.target.value)}
                          placeholder="Profile URL"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeSocial(idx)} 
                        className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={addSocial} 
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 hover:border-yellow-300 transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Social Media
                </button>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-6">
              <div className="border-l-4 border-yellow-600 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Location</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input 
                    name="location.address" 
                    value={form.location.address} 
                    onChange={handleChange} 
                    placeholder="Street address" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input 
                    name="location.city" 
                    value={form.location.city} 
                    onChange={handleChange} 
                    placeholder="City" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input 
                    name="location.state" 
                    value={form.location.state} 
                    onChange={handleChange} 
                    placeholder="State" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input 
                    name="location.country" 
                    value={form.location.country} 
                    onChange={handleChange} 
                    placeholder="Country" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                  <input 
                    name="location.pincode" 
                    value={form.location.pincode} 
                    onChange={handleChange} 
                    placeholder="PIN/ZIP code" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-500" 
                  />
                </div>
              </div>
            </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleSubmit} 
                disabled={loading || fetchingData || !form.businessName?.trim()}
                className="w-full bg-button-gradient text-black py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] focus:ring-4 focus:ring-blue-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {getSubmitButtonText()}
              </Button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailsModal;