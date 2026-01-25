import React from "react";

type PlanSelectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: string) => void; // Optional: callback for plan selection
  currentPlan?: string; // Optional: to highlight the current plan
};

const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  currentPlan = "Free",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <div className="p-4 sm:p-6 lg:p-8">
          <button
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-800 z-10"
            onClick={onClose}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-black mb-4 sm:mb-6 pr-8">Choose Your Plan</h2>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Free Plan */}
            <div className="border rounded-lg p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-black">Free</h3>
              <p className="text-xl sm:text-2xl font-bold my-2 text-black">₹0</p>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">/Forever</p>
              <ul className="text-xs sm:text-sm text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-black">
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Basic business profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Up to 10 posts per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Community support</span>
                </li>
              </ul>
              <button
                className="w-full bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg cursor-default text-sm sm:text-base"
                disabled={currentPlan === "Free"}
                onClick={() => onSelectPlan && onSelectPlan("Free")}
              >
                {currentPlan === "Free" ? "Current Plan" : "Choose Free"}
              </button>
            </div>

            {/* Small Business Plan */}
            <div className="border-2 border-yellow-400 bg-yellow-50 rounded-lg p-4 sm:p-6 text-center relative">
              <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
              <h3 className="text-lg sm:text-xl font-semibold text-black">Small Business</h3>
              <p className="text-xl sm:text-2xl font-bold my-2 text-black">₹999</p>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">/per month</p>
              <ul className="text-xs sm:text-sm text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-black">
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Enhanced business profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Unlimited posts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Product catalog (up to 50 items)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Basic advertising tools</span>
                </li>
              </ul>
              <button
                className="w-full bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm sm:text-base"
                disabled={currentPlan === "Small Business"}
                onClick={() => onSelectPlan && onSelectPlan("Small Business")}
              >
                {currentPlan === "Small Business" ? "Current Plan" : "Upgrade Now"}
              </button>
            </div>

            {/* Corporate Plan */}
            <div className="border rounded-lg p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-black">Corporate</h3>
              <p className="text-xl sm:text-2xl font-bold my-2 text-black">₹2999</p>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">/per month</p>
              <ul className="text-xs sm:text-sm text-left space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 text-black">
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Premium business profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Unlimited everything</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Advanced analytics & insights</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Unlimited product catalog</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>Advanced advertising & promotion</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>API access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className='text-green-500 text-lg sm:text-xl flex-shrink-0 mt-0.5'>✔</span>
                  <span>White-label options</span>
                </li>
              </ul>
              <button
                className="w-full bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm sm:text-base"
                disabled={currentPlan === "Corporate"}
                onClick={() => onSelectPlan && onSelectPlan("Corporate")}
              >
                {currentPlan === "Corporate" ? "Current Plan" : "Upgrade Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanSelectionModal;