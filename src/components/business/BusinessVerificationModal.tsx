import React, { useRef, useState, useEffect } from 'react';
import { uploadBusinessDocument } from '@/api/business';

type DocumentKey =
  | 'businessRegistration'
  | 'companyPan'
  | 'taxCertificate'
  | 'representativeId'
  | 'representativeAddress'
  | 'businessAddress'
  | 'aadhaar'
  | 'panCard';

export interface BusinessVerificationPayload {
  businessRegistration?: File;
  companyPan?: File;
  taxCertificate?: File;
  representativeId?: File;
  representativeAddress?: File;
  businessAddress?: File;
  aadhaar?: File;
  panCard?: File;
}

interface BusinessVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: BusinessVerificationPayload) => void;
}

const LABELS: Record<DocumentKey, string> = {
  businessRegistration: 'Upload Business Registration Certificate',
  companyPan: 'Upload Company PAN Certificate',
  taxCertificate: 'Upload TIN Number or GST Certificate',
  representativeId: "Upload Authorized Representative's ID Proof",
  representativeAddress: "Upload Authorized Representative's Address Proof",
  businessAddress: 'Upload Business Address Proof',
  aadhaar: 'Upload Aadhaar Card',
  panCard: 'Upload PAN Card'
};

const REGISTERED_DOCUMENTS: DocumentKey[] = [
  'businessRegistration',
  'companyPan',
  'taxCertificate',
  'representativeId',
  'representativeAddress',
  'businessAddress'
];

const NON_REGISTERED_DOCUMENTS: DocumentKey[] = [
  'aadhaar',
  'panCard'
];

const BusinessVerificationModal: React.FC<BusinessVerificationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [files, setFiles] = useState<BusinessVerificationPayload>({});
  const [isRegistered, setIsRegistered] = useState<boolean>(true);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<DocumentKey, HTMLInputElement | null>>({
    businessRegistration: null,
    companyPan: null,
    taxCertificate: null,
    representativeId: null,
    representativeAddress: null,
    businessAddress: null,
    aadhaar: null,
    panCard: null
  });

  useEffect(() => {
    if (!isOpen) {
      // Reset success state when modal is closed
      setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerFile = (key: DocumentKey) => inputRefs.current[key]?.click();

  const handleFileChange = (key: DocumentKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const mapKeyToDocumentType = (key: DocumentKey): 'aadhaar' | 'gst' | 'pan' | 'license' | 'registration' | 'other' => {
    switch (key) {
      case 'aadhaar':
        return 'aadhaar';
      case 'panCard':
        return 'pan';
      case 'taxCertificate':
        return 'gst';
      case 'businessRegistration':
        return 'registration';
      case 'companyPan':
        return 'pan';
      case 'representativeId':
      case 'representativeAddress':
      case 'businessAddress':
        return 'license'; // best-fit mapping; backend also supports 'other' if needed
      default:
        return 'other';
    }
  };

  const handleUpload = async () => {
    // keep existing callback behavior for any downstream usage
    onSubmit(files);

    // Upload each selected file individually to backend
    const entries = Object.entries(files) as [DocumentKey, File][];
    if (entries.length === 0) {
      setError('Please select at least one document to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      for (const [key, file] of entries) {
        const documentType = mapKeyToDocumentType(key);
        await uploadBusinessDocument(file, documentType);
      }
      setShowSuccess(true);
      // Auto close the modal after showing success message for 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 3000);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message || err?.message || 'Failed to upload documents');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleBackdropClick}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-black text-lg font-semibold">Upload KYC</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-600 hover:text-gray-800 p-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showSuccess ? (
          // Success Message
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">Documents Submitted!</h3>
            <p className="text-gray-600 text-sm mb-4">
              Your documents have been submitted for verification. We&apos;ll review them and get back to you soon.
            </p>
            <div className="text-xs text-gray-500">This window will close automatically</div>
          </div>
        ) : (
          <>
            {/* Toggle for Registered/Non-Registered */}
        <div className="mb-6">
          <div className="flex items-center justify-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setIsRegistered(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isRegistered 
                  ? 'bg-button-gradient text-black shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Registered
            </button>
            <button
              onClick={() => setIsRegistered(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isRegistered 
                  ? 'bg-button-gradient text-black shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Non-Registered
            </button>
          </div>
          
          {/* Disclaimer Text */}
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 text-center">
              <span className="font-medium">Note:</span> Any 2 documents are required for verification
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(isRegistered ? REGISTERED_DOCUMENTS : NON_REGISTERED_DOCUMENTS).map(key => (
            <div key={key} className="border rounded-xl px-3 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                </svg>
                <span className="text-sm text-gray-800">{LABELS[key]}</span>
              </div>
              <div className="flex items-center gap-2">
                {files[key] && <span className="text-xs text-gray-600 truncate max-w-[120px]">{files[key]?.name}</span>}
                <button
                  onClick={() => triggerFile(key)}
                  className="px-3 py-1.5 text-xs text-black bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  disabled={isUploading}
                >
                  {files[key] ? 'Change' : 'Upload'}
                </button>
                <input
                  ref={(el) => { inputRefs.current[key] = el; }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileChange(key, e)}
                />
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
        )}
        <button
          onClick={handleUpload}
          className="mt-5 w-full py-2.5 rounded-lg bg-button-gradient text-black font-medium disabled:opacity-50"
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>

        <p className="mt-3 text-[11px] text-gray-500 text-center">
          Please review all your uploaded documents before submitting.
        </p>
        </>
        )}
      </div>
    </div>
  );
};

export default BusinessVerificationModal;


