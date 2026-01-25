function buildFormData(formData: FormData, data: any, parentKey = '') {
  if (data instanceof File) {
    // If it's a File, append directly
    formData.append(parentKey, data);
  } else if (Array.isArray(data)) {
    // If it's an array of Files or primitives
    data.forEach((value) => {
      if (value instanceof File) {
        // For files, use the same key (e.g., image)
        formData.append(parentKey, value);
      } else if (typeof value === 'object') {
        // For objects in array, flatten with index
        buildFormData(formData, value, `${parentKey}[]`);
      } else {
        // For primitives, use key[]
        formData.append(`${parentKey}[]`, value);
      }
    });
  } else if (data && typeof data === 'object') {
    // For objects, recurse
    Object.keys(data).forEach(key => {
      buildFormData(formData, data[key], parentKey ? `${parentKey}[${key}]` : key);
    });
  } else if (data !== undefined && data !== null) {
    // For primitives
    formData.append(parentKey, data);
  }
}
export default buildFormData; 