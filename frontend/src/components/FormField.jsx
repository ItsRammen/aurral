/**
 * FormField - A reusable form field component
 * 
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} [props.type='text'] - Input type
 * @param {string} [props.id] - Input id (defaults to label)
 * @param {string} [props.name] - Input name
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.disabled] - Whether field is disabled
 * @param {string} [props.error] - Error message
 * @param {string} [props.hint] - Hint text below field
 * @param {React.ReactNode} [props.icon] - Optional icon component
 * @param {React.ReactNode} [props.children] - For select fields, render option children
 * @param {string} [props.className] - Additional classes for the input
 */
export default function FormField({
    label,
    type = 'text',
    id,
    name,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    hint,
    icon: Icon,
    children,
    className = ''
}) {
    const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
    const isSelect = type === 'select';
    const isTextarea = type === 'textarea';

    const baseClasses = `w-full bg-gray-50 dark:bg-gray-800 border rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${Icon ? 'pl-10' : ''} ${className}`;

    const renderInput = () => {
        if (isSelect) {
            return (
                <select
                    id={fieldId}
                    name={name || fieldId}
                    value={value}
                    onChange={onChange}
                    required={required}
                    disabled={disabled}
                    className={baseClasses}
                >
                    {children}
                </select>
            );
        }

        if (isTextarea) {
            return (
                <textarea
                    id={fieldId}
                    name={name || fieldId}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`${baseClasses} min-h-[100px] resize-y`}
                />
            );
        }

        return (
            <input
                type={type}
                id={fieldId}
                name={name || fieldId}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={baseClasses}
            />
        );
    };

    return (
        <div className="space-y-2">
            <label
                htmlFor={fieldId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
                {renderInput()}
            </div>
            {hint && !error && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
            )}
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </div>
    );
}
