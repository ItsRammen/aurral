import { Loader } from 'lucide-react';

/**
 * LoadingSpinner - A consistent loading spinner component
 * 
 * @param {Object} props
 * @param {string} [props.size='md'] - Size: 'sm', 'md', 'lg', 'xl'
 * @param {string} [props.className] - Additional classes
 * @param {string} [props.text] - Optional loading text
 */
export default function LoadingSpinner({ size = 'md', className = '', text }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <Loader className={`${sizeClasses[size]} text-primary-500 animate-spin`} />
            {text && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
            )}
        </div>
    );
}
