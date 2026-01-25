// components/ui/button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'custom';
  size?: 'sm' | 'default' | 'lg';
}

const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50';

const variantStyles = {
  default: 'bg-black text-white hover:bg-gray-800',
  outline: 'border border-gray-300 text-black hover:bg-gray-100',
  custom: '', 
};

const sizeStyles = {
  sm: 'h-9 px-3',
  default: 'h-10 px-4 py-2',
  lg: 'h-11 px-6',
};
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const variantClass = variantStyles[variant];
    const sizeClass = sizeStyles[size];
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
