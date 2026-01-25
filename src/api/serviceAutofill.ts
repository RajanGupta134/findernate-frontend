import axios from './base';

// Toggle auto-fill setting for service posts
export const toggleServiceAutofill = async (enableAutoFill: boolean) => {
  try {
    const response = await axios.put('/users/service-post/toggle-autofill', {
      enableAutoFill
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Get previous service post data for autofill
export const getServicePreviousData = async () => {
  try {
    const response = await axios.get('/users/service-post/previous-data');
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Toggle auto-fill setting for product posts (for future use)
export const toggleProductAutofill = async (enableAutoFill: boolean) => {
  try {
    const response = await axios.put('/users/product-post/toggle-autofill', {
      enableAutoFill
    });
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Get previous product post data for autofill (for future use)
export const getProductPreviousData = async () => {
  try {
    const response = await axios.get('/users/product-post/previous-data');
    return response.data;
  } catch (error: any) {
    throw error;
  }
};
