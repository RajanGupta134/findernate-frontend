import React from 'react';

interface RegularPostFormProps {
  formData: {
    // mood: string; // Commented out for now
    // activity: string; // Commented out for now
  };
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

// const moods = ['Happy', 'Excited', 'Relaxed', 'Grateful', 'Motivated', 'Energetic', 'Content', 'Inspired', 'Joyful']; // Commented out
const activities = ['Relaxing', 'Working', 'Travelling', 'Exercising', 'Cooking', 'Reading', 'Shopping', 'Studying', 'Socializing', 'Gaming', 'Chilling'];

const RegularPostForm: React.FC<RegularPostFormProps> = ({ formData, onChange }) => {
  return null;
};

export default RegularPostForm;