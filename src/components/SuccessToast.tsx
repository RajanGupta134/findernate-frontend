import { Check } from 'lucide-react';

export default function SuccessToast({ show, message = "Post created successfully!" }: { show: boolean, message: string }) {
  if (!show) return null;
  
  return (
    <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-500">
      <div className="relative bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl flex items-center gap-4 shadow-2xl backdrop-blur-sm border border-white/20 overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-emerald-400/20 animate-pulse"></div>
        
        {/* Success icon with animation */}
        <div className="relative z-10 bg-white/20 p-2 rounded-full backdrop-blur-sm">
          <Check className="w-5 h-5 text-white animate-in zoom-in duration-300 delay-200" />
        </div>
        
        {/* Message text */}
        <span className="relative z-10 font-medium text-sm tracking-wide">{message}</span>
        
        {/* Decorative elements */}
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-white/10 rounded-full blur-sm"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white/5 rounded-full blur-sm"></div>
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 w-1/3 animate-in slide-in-from-left-full duration-1000 delay-300"></div>
      </div>
    </div>
  );
}