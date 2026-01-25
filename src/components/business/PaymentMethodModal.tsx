import { ChevronLeft, ChevronRight, Plus, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

// A single payment method item component
const PaymentMethodItem = ({ icon, name, onClick }: { icon: React.ReactNode, name: string, onClick?: () => void }) => (
  <div className="flex items-center justify-between py-4 px-1 hover:bg-gray-50 cursor-pointer transition-colors duration-200" onClick={onClick}>
    <div className="flex items-center space-x-4">
      {icon}
      <span className="text-base font-medium text-gray-800">{name}</span>
    </div>
    <ChevronRight className="text-gray-400" size={20} />
  </div>
);

// The main modal component
export const PaymentMethodsModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePaymentClick = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/40 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600">Your payment has been processed successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg h-[85vh] rounded-t-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Modal Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft className="text-gray-700" size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">Payment Methods</h2>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <Plus className="text-gray-700" size={24} />
          </button>
        </header>

        {/* Modal Body */}
        <main className="flex-grow p-4 overflow-y-auto">
          <div className="divide-y divide-gray-200">
            <PaymentMethodItem icon={<Image width={20} height={20} src="/payment/visa-3-svgrepo-com.svg" alt="Visa" className="w-10 h-6 rounded-md" />} name="Visa" onClick={handlePaymentClick} />
            <PaymentMethodItem icon={<Image width={20} height={20} src="/payment/mastercard-svgrepo-com.svg" alt="MasterCard" className="w-10 h-6 rounded-md" />} name="MasterCard" onClick={handlePaymentClick} />
            <PaymentMethodItem icon={<Image width={20} height={20} src="/payment/pay-pal-paypal-payments-platform-svgrepo-com.svg" alt="PayPal" className="w-10 h-6 rounded-md" />} name="PayPal" onClick={handlePaymentClick} />
            <PaymentMethodItem icon={<Image width={20} height={20} src="/payment/google-pay-primary-logo-logo-svgrepo-com.svg" alt="Google Pay" className="w-10 h-6 rounded-md" />} name="Google Pay" onClick={handlePaymentClick} />
          </div>
        </main>
      </div>
    </div>
  );
};