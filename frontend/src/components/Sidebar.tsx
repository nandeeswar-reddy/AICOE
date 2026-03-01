import { LayoutDashboard, Send, Calendar, BarChart2, FileText, Settings } from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'submission', label: 'Job Submission', icon: Send },
        { id: 'scheduler', label: 'Scheduler', icon: Calendar },
        { id: 'metrics', label: 'Metrics', icon: BarChart2 },
        { id: 'logs', label: 'Logs', icon: FileText },
        { id: 'admin', label: 'Admin', icon: Settings },
    ];

    return (
        <aside className="w-64 h-screen bg-surface border-r border-border shrink-0 flex flex-col hidden lg:flex">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-border">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-sm bg-primary/20 flex items-center justify-center">
                        <div className="w-3 h-3 bg-primary rounded-sm" />
                    </div>
                    <span className="font-bold text-lg tracking-wider text-text">AICOE-X</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-subtext hover:text-text hover:bg-surface-hover'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                    {isActive && (
                                        <div className="ml-auto w-1 h-1 rounded-full bg-primary" />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};
