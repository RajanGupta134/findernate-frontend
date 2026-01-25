import axios from './base'

export const getHomeFeed = async({page, limit}: {page: number, limit: number}) => {
    const response = await axios.get(`/posts/home-feed?page=${page}&limit=${limit}`)

    return response.data
}

export const getPostsByUserid = async(userId: string, postType?: string) => {
    const params = postType ? `?postType=${postType}` : '';
    const response = await axios.get(`/posts/user/${userId}/profile${params}`)

    return response.data
}

// Specific functions for different post types
export const getUserPosts = async(userId: string) => {
    return await getPostsByUserid(userId, 'photo');
}

export const getUserReels = async(userId: string) => {
    return await getPostsByUserid(userId, 'reel');
}

export const getUserVideos = async(userId: string) => {
    return await getPostsByUserid(userId, 'video');
}