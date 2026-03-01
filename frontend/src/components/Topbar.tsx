import React from 'react';
import { Search, Bell, User } from 'lucide-react';

export const Topbar: React.FC = () => {
    return (
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
            {/* Search */}
            <div className="flex items-center bg-background/50 border border-border rounded-md px-3 py-1.5 w-96 max-w-md focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
                <Search className="w-4 h-4 text-subtext mr-2 shrink-0" />
                <input
                    type="text"
                    placeholder="Search Jobs, Models, Metrics..."
                    className="bg-transparent border-none text-sm text-text focus:outline-none w-full placeholder:text-subtext/50"
                />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
                <button className="text-subtext hover:text-text relative p-2 rounded-full hover:bg-background/50 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-surface"></span>
                </button>

                <div className="flex items-center gap-2 pl-4 border-l border-border">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                </div>
            </div>
        </header>
    );
};
