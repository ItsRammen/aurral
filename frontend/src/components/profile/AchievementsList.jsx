import React from 'react';
import { Award, CheckCircle } from 'lucide-react';

const AchievementsList = ({ achievements }) => {
    if (!achievements || achievements.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                    <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                Achievements
                <span className="text-sm font-bold text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {achievements.filter(a => a.unlocked).length}/{achievements.length}
                </span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {achievements.map((achievement) => (
                    <div
                        key={achievement.id}
                        className={`group relative p-4 rounded-2xl border-2 text-center transition-all duration-300 ${achievement.unlocked
                            ? 'bg-gradient-to-item from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800 shadow-sm hover:shadow-md hover:-translate-y-1'
                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
                            }`}
                        title={achievement.description}
                    >
                        <div className={`text-4xl mb-3 transform transition-transform group-hover:scale-110 ${!achievement.unlocked && 'grayscale opacity-50'}`}>
                            {achievement.icon}
                        </div>
                        <p className={`text-xs font-bold leading-tight ${achievement.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {achievement.name}
                        </p>

                        {!achievement.unlocked && achievement.progress !== undefined && (
                            <div className="mt-3">
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 font-mono">{achievement.progress}/{achievement.total}</p>
                            </div>
                        )}

                        {achievement.unlocked && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900 animate-in zoom-in spin-in-12 duration-300">
                                <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3px]" />
                            </div>
                        )}

                        {/* Tooltip on hover */}
                        <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg shadow-xl w-32 whitespace-normal z-50">
                                {achievement.description}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AchievementsList;
