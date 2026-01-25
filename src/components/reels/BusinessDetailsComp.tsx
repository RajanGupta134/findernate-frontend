'use client';
import React from 'react';
import { 
  Phone, 
  Mail, 
  Globe, 
  Share2, 
  MapPin, 
  Clock, 
  Star,
  Megaphone,
  Tag,
  ExternalLink,
  Wifi,
  Music,
  TreePine
} from 'lucide-react';

interface BusinessHours {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface Promotion {
  title: string;
  description: string;
  discount: number;
  validUntil: string;
  isActive: boolean;
}

interface BusinessProfileProps {
  businessName: string;
  businessType: string;
  category: string;
  subcategory: string;
  description: string;
  announcement?: string;
  promotions?: Promotion[];
  contact: {
    phone: string;
    email: string;
    website?: string;
    socialMedia?: string;
  };
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  hours: BusinessHours[];
  features: string[];
  rating: number;
}

const BusinessProfile: React.FC<BusinessProfileProps> = ({
  businessName,
  businessType,
  category,
  subcategory,
  description,
  announcement,
  promotions,
  contact,
  location,
  hours,
  features,
  rating
}) => {
  const activePromotion = promotions?.find(promo => promo.isActive);

  const getFeatureIcon = (feature: string) => {
    switch (feature.toLowerCase()) {
      case 'free wifi':
        return <Wifi className="w-4 h-4 text-teal-600" />;
      case 'live music':
        return <Music className="w-4 h-4 text-teal-600" />;
      case 'outdoor seating':
        return <TreePine className="w-4 h-4 text-teal-600" />;
      default:
        return <div className="w-2 h-2 bg-teal-600 rounded-full" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Announcement Section */}
      {announcement && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Megaphone className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">
                ANNOUNCEMENT
              </div>
              <p className="text-yellow-800 text-sm">{announcement}</p>
            </div>
          </div>
        </div>
      )}

      {/* Special Offer Section */}
      {activePromotion && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                  SPECIAL OFFER
                </div>
                <h4 className="font-semibold text-red-800 mb-1">{activePromotion.title}</h4>
                <p className="text-red-700 text-sm">{activePromotion.description}</p>
              </div>
            </div>
            <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              {activePromotion.discount}% OFF
            </div>
          </div>
        </div>
      )}

      {/* Business Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded text-yellow-500 flex items-center justify-center text-xs font-bold">
                📋
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{businessName}</h1>
              <p className="text-sm text-purple-600">{businessType}</p>
            </div>
          </div>
          <button className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-gray-700 text-sm">{description}</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Phone className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">PHONE</span>
          </div>
          <p className="text-gray-800 font-medium">{contact.phone}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Mail className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">EMAIL</span>
          </div>
          <p className="text-gray-600 text-sm">{contact.email}</p>
        </div>

        {contact.website && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">WEBSITE</span>
              <ExternalLink className="w-3 h-3" />
            </div>
            <p className="text-gray-800">{contact.website}</p>
          </div>
        )}

        {contact.socialMedia && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">SOCIAL</span>
              <ExternalLink className="w-3 h-3" />
            </div>
            <p className="text-gray-800">{contact.socialMedia}</p>
          </div>
        )}
      </div>

      {/* Category & Type */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-purple-600 mb-3">
          <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-sm font-semibold uppercase">CATEGORY & TYPE</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-100 p-3 rounded-lg">
            <p className="text-xs text-purple-600 mb-1">Category</p>
            <p className="font-medium text-gray-800">{category}</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-lg">
            <p className="text-xs text-purple-600 mb-1">Subcategory</p>
            <p className="font-medium text-gray-800">{subcategory}</p>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-red-600 mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase">LOCATION</span>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-gray-800 font-medium">{location.address}</p>
          <p className="text-gray-600">{location.city}, {location.state}</p>
          <p className="text-gray-600">{location.country} - {location.postalCode}</p>
        </div>
      </div>

      {/* Business Hours */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-teal-600 mb-3">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase">BUSINESS HOURS</span>
        </div>
        
        <div className="space-y-2">
          {hours.map((hour, index) => (
            <div key={index} className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                <span className="text-gray-800 font-medium">{hour.day}</span>
              </div>
              <div className="bg-teal-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                {hour.isClosed ? 'Closed' : `${hour.openTime} - ${hour.closeTime}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <span className="text-2xl font-bold text-yellow-600">{rating}</span>
            <span className="text-sm font-semibold text-yellow-700 uppercase">RATING</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-teal-600 mb-3">
          <div className="w-4 h-4 bg-teal-600 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-sm font-semibold uppercase">FEATURES</span>
        </div>
        
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                {getFeatureIcon(feature)}
                <span className="text-gray-800">{feature}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Example usage component
const ExampleBusinessProfile = () => {
  const sampleData = {
    businessName: "Urban Cafe",
    businessType: "Cafe",
    category: "Food & Beverage",
    subcategory: "Cafe",
    description: "Trendy new cafe with artisan coffee and snacks.",
    announcement: "Grand opening this weekend! Free coffee for the first 50 guests.",
    promotions: [
      {
        title: "Opening Offer",
        description: "Buy 1 Get 1 Free on all coffees.",
        discount: 50,
        validUntil: "2025-08-01T23:59:59.000Z",
        isActive: true
      }
    ],
    contact: {
      phone: "+91-9876543210",
      email: "info@urbancafe.com",
      website: "urbancafe.com",
      socialMedia: "Findernate"
    },
    location: {
      address: "A-12, Connaught Place",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      postalCode: "110001"
    },
    hours: [
      { day: "Monday", openTime: "08:00", closeTime: "22:00", isClosed: false },
      { day: "Tuesday", openTime: "08:00", closeTime: "22:00", isClosed: false },
      { day: "Wednesday", openTime: "08:00", closeTime: "22:00", isClosed: false },
      { day: "Thursday", openTime: "08:00", closeTime: "22:00", isClosed: false },
      { day: "Friday", openTime: "08:00", closeTime: "23:00", isClosed: false },
      { day: "Saturday", openTime: "09:00", closeTime: "23:00", isClosed: false },
      { day: "Sunday", openTime: "09:00", closeTime: "21:00", isClosed: false }
    ],
    features: ["Free Wifi", "Outdoor Seating", "Live Music"],
    rating: 4.8
  };

  return <BusinessProfile {...sampleData} />;
};

export default ExampleBusinessProfile;