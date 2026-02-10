import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal - A reusable modal component with consistent styling
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Callback when modal closes
 * @param {string} props.title - Modal title
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} [props.footer] - Optional footer content
 * @param {string} [props.size='md'] - Size: 'sm', 'md', 'lg', 'xl'
 * @param {boolean} [props.showClose=true] - Show close button
 * @param {boolean} [props.closeOnBackdrop=true] - Close on backdrop click
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = 'md',
    showClose = true,
    closeOnBackdrop = true
}) {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl'
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                    onClick={closeOnBackdrop ? onClose : undefined}
                    aria-hidden="true"
                />

                {/* Modal Content */}
                <div className={`relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden animate-fade-in`}>
                    {/* Header */}
                    {(title || showClose) && (
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                            <div>
                                {title && (
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {title}
                                    </h2>
                                )}
                                {subtitle && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                            {showClose && (
                                <button
                                    onClick={onClose}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                    aria-label="Close modal"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Body */}
                    <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
