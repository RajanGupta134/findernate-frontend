import { CreateBusinessRequest, UpdateBusinessRequest } from "@/types";
import axios from "./base";

export const AddBusinessDetails = async (business: CreateBusinessRequest) => {
    const response = await axios.post("/business/create", business);
    return response.data;
};  

export const GetBusinessDetails = async () => {
    const response = await axios.get("/business/profile");
    return response.data;
}

// Get business ID for the current user
export const getMyBusinessId = async () => {
    try {
        const response = await axios.get("/business/profile");
        return response.data?.data?._id || response.data?._id || null;
    } catch (error: unknown) {
        console.error('Error fetching business ID:', error);
        throw error;
    }
}

export const getBusinessProfileDetails = async (userId: string) => {
    try {
        const response = await axios.get(`/business/profile?userId=${userId}`);
        return response.data;
    } catch (error: unknown) {
        throw error;
    }
}

export const UpdateBusinessDetails = async (business: UpdateBusinessRequest) => {
    const response = await axios.patch("/business/update", business);
    return response.data;
}

export const UpdateBusinessCategory = async (category: string) => {
    const response = await axios.patch("/business/update-category", { category });
    return response.data;
}

export const UpdateBusinessSubCategory = async (subcategory: string, category: string) => {
    const response = await axios.patch("/business/update-category", { subcategory, category });
    return response.data;
}

export const GetBusinessCategory = async () => {
    const response = await axios.get("/business/my-category");
    return response.data;
}

export const switchToBusiness = async () => {
    const response = await axios.post("/business/switch-to-business");
    return response.data;
}

export const switchToPersonal = async () => {
    const response = await axios.post("/business/switch-to-personal");
    return response.data;
}

// Toggle allowed post types for business accounts
export const toggleServicePosts = async (businessId: string) => {
    try {
        const response = await axios.post("/business/toggle-service-posts", {
            businessId
        });
        return response.data;
    } catch (error: unknown) {
        throw error;
    }
}

export const toggleProductPosts = async (businessId: string) => {
    try {
        const response = await axios.post("/business/toggle-product-posts", {
            businessId
        });
        return response.data;
    } catch (error: unknown) {
        throw error;
    }
}

export const getBusinessRatingSummary = async (businessId: string) => {
    const response = await axios.get(`/business/${businessId}/rating-summary`);
    return response.data;
}

export const rateBusiness = async (businessId: string, rating: number) => {
    const response = await axios.post(`/business/${businessId}/rate`, { rating });
    return response.data;
}

// Upload a single verification document
// endpoint: POST /business/upload-document
// body multipart/form-data: { document: File, documentType: 'aadhaar'|'gst'|'pan'|'license'|'registration'|'other' }
export const uploadBusinessDocument = async (document: File, documentType: 'aadhaar' | 'gst' | 'pan' | 'license' | 'registration' | 'other') => {
    const formData = new FormData();
    formData.append('document', document);
    formData.append('documentType', documentType);

    const response = await axios.post('/business/upload-document', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
}

// Bank Details API functions
export const AddOrUpdateBankDetails = async (bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'savings' | 'current' | '';
    upiId?: string;
    branchName?: string;
}) => {
    const response = await axios.post('/business/bank-details', bankDetails);
    return response.data;
}

export const GetBankDetails = async () => {
    const response = await axios.get('/business/bank-details');
    return response.data;
}

export const DeleteBankDetails = async () => {
    const response = await axios.delete('/business/bank-details');
    return response.data;
}