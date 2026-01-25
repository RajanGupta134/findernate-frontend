'use client';
import React from 'react';
import { 
  Star,
  IndianRupee,
  Clock,
  MapPin,
  Calendar,
  Building,
  List,
  Truck
} from 'lucide-react';

interface ServiceLocation {
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

interface ServiceAvailability {
  bookingAdvance: string;
  maxBookingsPerDay: string;
}

interface ServiceProfileProps {
  serviceName: string;
  description: string;
  price: string;
  currency: string;
  duration: number;
  category: string;
  subcategory: string;
  serviceType: string;
  location: ServiceLocation;
  availability: ServiceAvailability;
  requirements: string[];
  deliverables: string[];
}

const ServiceProfile: React.FC<ServiceProfileProps> = ({
  serviceName,
  description,
  price,
  currency,
  duration,
  category,
  subcategory,
  serviceType,
  location,
  availability,
  requirements,
  deliverables
}) => {
  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Service Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
            <Star className="w-6 h-6 text-white fill-current" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{serviceName}</h1>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">{description}</p>
        </div>
      </div>

      {/* Price and Duration */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <IndianRupee className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">PRICE</span>
          </div>
          <p className="text-xl font-bold text-green-800">{currency} {price}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase">DURATION</span>
          </div>
          <p className="text-xl font-bold text-green-800">{duration} min</p>
        </div>
      </div>

      {/* Category & Type */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-blue-600 mb-3">
          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="text-sm font-semibold uppercase">CATEGORY & TYPE</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-blue-100 p-3 rounded-lg">
            <p className="text-xs text-blue-600 mb-1">Category</p>
            <p className="font-medium text-gray-800">{category}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            <p className="text-xs text-blue-600 mb-1">Subcategory</p>
            <p className="font-medium text-gray-800">{subcategory}</p>
          </div>
        </div>

        <div className="inline-block bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
          {serviceType}
        </div>
      </div>

      {/* Location Details */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-red-600 mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase">LOCATION DETAILS</span>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <Building className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-red-600">Service Type: </span>
              <span className="font-bold text-red-800 uppercase">{location.type}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <span className="text-sm font-medium text-red-600">Address:</span>
              <div className="text-red-800">
                <p>{location.address}</p>
                <p>{location.city}, {location.state}</p>
                <p>{location.country}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timing & Availability */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-blue-600 mb-3">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase">TIMING & AVAILABILITY</span>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800">{availability.bookingAdvance} • {availability.maxBookingsPerDay}</span>
          </div>
        </div>
      </div>

      {/* Requirements */}
      {requirements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-yellow-600 mb-3">
            <List className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase">REQUIREMENTS</span>
          </div>
          
          <div className="space-y-2">
            {requirements.map((requirement, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <span className="text-gray-800">{requirement}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What You'll Get */}
      {deliverables.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-teal-600 mb-3">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase">WHAT YOU&apos;LL GET</span>
          </div>
          
          <div className="space-y-2">
            {deliverables.map((deliverable, index) => (
              <div key={index} className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                  <span className="text-gray-800">{deliverable}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-8">
        <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-lg text-sm uppercase tracking-wide transition-colors">
          CLICK FOR MORE DETAILS
        </button>
      </div>
    </div>
  );
};

// Example usage component
const ExampleServiceProfile = () => {
  const sampleData = {
    serviceName: "Yoga Session",
    description: "Expert-led yoga for all levels.",
    price: "500",
    currency: "INR",
    duration: 60,
    category: "Health & Wellness",
    subcategory: "Fitness",
    serviceType: "IN-PERSON",
    location: {
      type: "STUDIO",
      address: "Connaught Place",
      city: "Delhi",
      state: "Delhi",
      country: "India"
    },
    availability: {
      bookingAdvance: "Book 1 hour(s) in advance",
      maxBookingsPerDay: "Maximum 5 bookings per day"
    },
    requirements: ["Yoga mat"],
    deliverables: ["1 hour yoga session"]
  };

  return <ServiceProfile {...sampleData} />;
};

export default ExampleServiceProfile;