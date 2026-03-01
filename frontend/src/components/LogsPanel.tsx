import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface LogsPanelProps {
    results?: any;
    telemetry?: any;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({ results, telemetry }) => {
    const [logs, setLogs] = useState<{ timestamp: string; message: string; type: string }[]>([]);

    useEffect(() => {
        if (!telemetry) return;
        const time = new Date().toLocaleTimeString();
        setLogs(prev => {
            const newLog = {
                timestamp: time,
                message: `Hardware heartbeat received. Power: ${telemetry.power_draw_w?.toFixed(1) || 0}W, Util: ${telemetry.gpu_utilization_pct?.toFixed(1) || 0}%`,
                type: 'info'
            };
            return [...prev, newLog].slice(-50); // Keep last 50
        });
    }, [telemetry]);

    useEffect(() => {
        if (!results) return;
        const time = new Date().toLocaleTimeString();
        setLogs(prev => {
            const newLog = {
                timestamp: time,
                message: `Job ${results.workload_features?.job_id || 'Submitted'} mapped to ${results.execution_strategy?.selected_strategy || 'Unknown'} (${results.scheduling_decision?.allocated_gpus || 0} GPUs)`,
                type: 'success'
            };
            return [...prev, newLog].slice(-50);
        });
    }, [results]);

    useEffect(() => {
        // Initial boot log
        setLogs([{
            timestamp: new Date().toLocaleTimeString(),
            message: "AICOE-X Deterministic Log Stream Initialized.",
            type: "system"
        }]);
    }, []);

    return (
        <div className="flex flex-col h-full bg-surface/30 border border-border rounded-lg overflow-hidden font-mono text-sm">
            <div className="bg-surface/80 border-b border-border p-3 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-text">System Event Tail</h3>
                <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live Forwarding
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {logs.length === 0 && (
                    <div className="text-subtext/50">Awaiting stream events...</div>
                )}
                {logs.map((log, idx) => (
                    <div key={idx} className="flex hover:bg-surface-hover/30 px-2 py-0.5 rounded">
                        <span className="text-subtext/60 w-24 shrink-0">[{log.timestamp}]</span>
                        <span className={`flex-1 ${log.type === 'success' ? 'text-green-400' :
                                log.type === 'error' ? 'text-red-400' :
                                    log.type === 'system' ? 'text-purple-400' : 'text-text'
                            }`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
