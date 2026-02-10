import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * PageHeader - A consistent page header component
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} [props.subtitle] - Optional subtitle/description
 * @param {React.ReactNode} [props.icon] - Optional icon component
 * @param {React.ReactNode} [props.action] - Optional action button(s)
 * @param {boolean} [props.showBack] - Show back button
 * @param {function} [props.onBack] - Custom back handler (defaults to navigate(-1))
 */
export default function PageHeader({ title, subtitle, icon: Icon, action, showBack = false, onBack }) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                {showBack && (
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                )}
                {Icon && (
                    <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                )}
                <div>
                    <h1 className="page-title">{title}</h1>
                    {subtitle && <p className="page-subtitle">{subtitle}</p>}
                </div>
            </div>
            {action && (
                <div className="self-start md:self-auto">
                    {action}
                </div>
            )}
        </div>
    );
}
