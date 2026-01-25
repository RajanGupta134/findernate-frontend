import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const TimeTracker = () => {
  const [timeElapsed, setTimeElapsed] = useState(0); // seconds since page load

  useEffect(() => {
    // Set interval to update every second
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds < 10) {
      return "just now";
    } else if (seconds < 60) {
      return `${seconds} sec ago`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} min ago`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(seconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-blue-500" />
      <span className="text-gray-600">Updated {formatTime(timeElapsed)}</span>
    </div>
  );
};

export default TimeTracker;