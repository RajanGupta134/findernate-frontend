import { useState, useRef, useCallback } from 'react';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width?: number;
  height?: number;
}

interface UseCloudinaryUploadOptions {
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: ('image' | 'video')[];
  onSuccess?: (url: string, response: CloudinaryResponse) => void;
  onError?: (error: string) => void;
}

export const useCloudinaryUpload = (options: UseCloudinaryUploadOptions = {}) => {
  const {
    folder = 'findernate/orders',
    maxSizeMB = 50,
    allowedTypes = ['image', 'video'],
    onSuccess,
    onError,
  } = options;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size should not exceed ${maxSizeMB}MB`;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (allowedTypes.includes('image') && allowedTypes.includes('video')) {
      if (!isImage && !isVideo) {
        return 'Only image and video files are allowed';
      }
    } else if (allowedTypes.includes('image') && !isImage) {
      return 'Only image files are allowed';
    } else if (allowedTypes.includes('video') && !isVideo) {
      return 'Only video files are allowed';
    }

    return null;
  }, [maxSizeMB, allowedTypes]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadedUrl(null);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }

    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  }, [validateFile, onError]);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    setUploadedUrl(null);
  }, []);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadToCloudinary = useCallback(async (): Promise<string | null> => {
    if (!file) {
      setError('No file selected');
      return null;
    }

    try {
      setUploading(true);
      setError(null);

      // Get signature from our API
      const signResponse = await fetch('/api/cloudinary-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });

      if (!signResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, apiKey, cloudName } = await signResponse.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const result: CloudinaryResponse = await uploadResponse.json();
      setUploadedUrl(result.secure_url);
      onSuccess?.(result.secure_url, result);

      return result.secure_url;
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  }, [file, folder, onSuccess, onError]);

  return {
    file,
    preview,
    uploading,
    uploadedUrl,
    error,
    fileInputRef,
    handleFileSelect,
    clearFile,
    triggerFileSelect,
    uploadToCloudinary,
    setUploadedUrl,
  };
};

// Hook for multiple file uploads
interface UseMultipleCloudinaryUploadOptions extends UseCloudinaryUploadOptions {
  maxFiles?: number;
}

export const useMultipleCloudinaryUpload = (options: UseMultipleCloudinaryUploadOptions = {}) => {
  const { maxFiles = 5, folder = 'findernate/orders', ...restOptions } = options;

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    selectedFiles.forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) return;

      const maxSize = (restOptions.maxSizeMB || 50) * 1024 * 1024;
      if (file.size > maxSize) return;

      validFiles.push(file);

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
    setError(null);

    if (e.target) {
      e.target.value = '';
    }
  }, [files.length, maxFiles, restOptions.maxSizeMB]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setPreviews([]);
    setError(null);
    setUploadedUrls([]);
  }, []);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadAllToCloudinary = useCallback(async (): Promise<string[]> => {
    if (!files.length) {
      setError('No files selected');
      return [];
    }

    try {
      setUploading(true);
      setError(null);

      const urls: string[] = [];

      for (const file of files) {
        // Get signature
        const signResponse = await fetch('/api/cloudinary-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder }),
        });

        if (!signResponse.ok) {
          throw new Error('Failed to get upload signature');
        }

        const { signature, timestamp, apiKey, cloudName } = await signResponse.json();

        // Upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', folder);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        const result = await uploadResponse.json();
        urls.push(result.secure_url);
      }

      setUploadedUrls(urls);
      return urls;
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      return [];
    } finally {
      setUploading(false);
    }
  }, [files, folder]);

  return {
    files,
    previews,
    uploading,
    uploadedUrls,
    error,
    fileInputRef,
    handleFilesSelect,
    removeFile,
    clearFiles,
    triggerFileSelect,
    uploadAllToCloudinary,
  };
};
