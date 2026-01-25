import axios from "./base";

export const getNotifications = async () => {
    const response = await axios.get(`/posts/notifications`);
    return response.data;
}

export const getUnreadCounts = async () => {
    const response = await axios.get(`/notifications/unread-counts`, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        // Add timestamp to prevent caching
        params: {
            _t: Date.now()
        }
    });
    return response.data;
}

export const markNotificationAsRead = async (notificationId: string) => {
    const response = await axios.put(`/notifications/${notificationId}/read`);
    return response.data;
}

export const markAllNotificationsAsRead = async () => {
    const response = await axios.put(`/notifications/mark-all-read`);
    return response.data;
}

