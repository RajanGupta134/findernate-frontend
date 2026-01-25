import { AddOrUpdateBankDetails, GetBankDetails } from "@/api/business";
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronLeft, CheckCircle, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';

type BankDetails = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'savings' | 'current' | '';
  upiId?: string;
  branchName?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const defaultData: BankDetails = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  accountType: "",
  upiId: "",
  branchName: "",
};

const BankDetailsModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState<BankDetails>(defaultData);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch bank details when modal opens
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (isOpen) {
        setFetchingData(true);
        try {
          const response = await GetBankDetails();

          if (response && response.data && response.data.hasBankDetails && response.data.bankDetails) {
            const bankData = response.data.bankDetails;

            setForm({
              accountHolderName: bankData.accountHolderName || '',
              bankName: bankData.bankName || '',
              accountNumber: '', // Don't populate masked account number
              ifscCode: bankData.ifscCode || '',
              accountType: bankData.accountType || '',
              upiId: bankData.upiId || '',
              branchName: bankData.branchName || '',
            });
          } else {
            setForm(defaultData);
          }
        } catch (error: any) {
          console.error('Error fetching bank details:', error);
          // Don't show error toast, just use default data
          setForm(defaultData);
        } finally {
          setFetchingData(false);
        }
      }
    };

    fetchBankDetails();
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!form.accountHolderName.trim()) {
      toast.error('Account holder name is required');
      return;
    }
    if (!form.bankName.trim()) {
      toast.error('Bank name is required');
      return;
    }
    if (!form.accountNumber.trim()) {
      toast.error('Account number is required');
      return;
    }
    if (!form.ifscCode.trim()) {
      toast.error('IFSC code is required');
      return;
    }
    if (!form.accountType) {
      toast.error('Account type is required');
      return;
    }

    // Validate IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(form.ifscCode.toUpperCase())) {
      toast.error('Invalid IFSC code format. Example: SBIN0001234');
      return;
    }

    setLoading(true);
    try {
      const response = await AddOrUpdateBankDetails(form);

      if (response && response.success) {
        setShowSuccess(true);
        toast.success('Bank details saved successfully');

        // Close modal and reset after showing success
        setTimeout(() => {
          setShowSuccess(false);
          setForm(defaultData);
          onClose();
          if (onSuccess) onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error saving bank details:', error);
      toast.error(error.response?.data?.message || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Success screen
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/40 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank Details Saved!</h3>
          <p className="text-gray-600">Your bank account details have been saved successfully.</p>
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
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/50 transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="text-gray-700" size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <Building2 className="text-blue-600" size={24} />
            <h2 className="text-lg font-bold text-gray-800">Bank Account Details</h2>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </header>

        {/* Modal Body */}
        <main className="flex-grow p-6 overflow-y-auto">
          {fetchingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">🔒 Secure Payment Settlement:</span> Add your bank account details to receive payments from your sales via our escrow system.
                </p>
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={form.accountHolderName}
                  onChange={handleChange}
                  placeholder="Enter account holder name"
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  placeholder="e.g., State Bank of India"
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  placeholder="Enter account number"
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              {/* IFSC Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={handleChange}
                  placeholder="e.g., SBIN0001234"
                  maxLength={11}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition uppercase"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">11-character code (e.g., SBIN0001234)</p>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="accountType"
                  value={form.accountType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                >
                  <option value="">Select account type</option>
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                </select>
              </div>

              {/* Branch Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="branchName"
                  value={form.branchName}
                  onChange={handleChange}
                  placeholder="e.g., Mumbai Main Branch"
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              {/* UPI ID (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI ID <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="upiId"
                  value={form.upiId}
                  onChange={handleChange}
                  placeholder="e.g., yourname@bankname"
                  className="w-full px-4 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Bank Details'
                  )}
                </Button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};

export default BankDetailsModal;
