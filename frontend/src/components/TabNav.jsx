/**
 * TabNav - A reusable tab navigation component
 * 
 * @param {Object} props
 * @param {Array} props.tabs - Array of tab objects with { id, label, badge? }
 * @param {string} props.activeTab - Currently active tab ID
 * @param {function} props.onChange - Callback when tab changes
 * @param {string} [props.className] - Additional classes for the container
 * @param {boolean} [props.centered] - Center tabs on mobile
 */
export default function TabNav({ tabs, activeTab, onChange, className = '', centered = false }) {
    return (
        <div className={`flex ${centered ? 'items-center justify-center md:justify-start' : ''} border-b border-gray-200 dark:border-gray-800 overflow-x-auto no-scrollbar ${className}`}>
            <nav className="flex space-x-4 sm:space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`group inline-flex items-center gap-2 py-4 px-1 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        {tab.icon && <tab.icon className="w-4 h-4" />}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-orange-900 dark:text-orange-200">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
}
