import React, { useState, useEffect } from 'react';
import { ChevronDown, Zap, MemoryStick, Cpu, Clock, ZapOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface JobSubmissionPanelProps {
    onRunOptimization?: (workload: any, hardware: any) => void;
    isLoading?: boolean;
    results?: any;
}

export const JobSubmissionPanel: React.FC<JobSubmissionPanelProps> = ({ onRunOptimization, isLoading, results }) => {
    const [workload, setWorkload] = useState({
        job_id: "test_job_002",
        framework: "pytorch",
        model_file_path: "Llama-3-8B",
        batch_size: 1024,
        training_mode: false,
        precision_mode: "FP16",
        deadline_hours: 4,
        priority: "high",
        parameters_billion: 8.0
    });

    const handleSubmit = () => {
        if (onRunOptimization) {
            onRunOptimization(workload, {});
        }
    };

    const [schedulingHistory, setSchedulingHistory] = useState<any[]>([]);

    useEffect(() => {
        if (results?.hardware_state) {
            setSchedulingHistory(prev => {
                const newHist = [...prev, {
                    time: `T+${prev.length}`,
                    value: results.prediction?.predicted_energy_j || results.hardware_state.power_draw_w || 0
                }];
                return newHist.slice(-15);
            });
        }
    }, [results]);

    const schedulingData = schedulingHistory.length > 0 ? schedulingHistory : Array.from({ length: 15 }, (_, i) => ({
        time: i * 10,
        value: 0
    }));

    // Extraction for Resource Requirements
    const metrics = results?.final_estimated_metrics;
    const estGflops = metrics?.estimated_final_throughput_req_sec ? (metrics.estimated_final_throughput_req_sec * workload.batch_size * 2).toFixed(1) + "G FLOPs" : "-";
    const memReq = results?.prediction?.predicted_memory_mb ? (results.prediction.predicted_memory_mb / 1024).toFixed(1) + " GB" : "-";
    const powerLim = results?.hardware_state?.power_draw_w ? results.hardware_state.power_draw_w.toFixed(0) + " W" : "-";

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex gap-4 flex-1 overflow-y-auto">
                {/* Left Side: Forms */}
                <div className="flex-1 space-y-4 pr-1">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-subtext text-xs font-medium mb-1">Model / Path</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-primary/50"
                                    value={workload.model_file_path}
                                    onChange={(e) => setWorkload({ ...workload, model_file_path: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-subtext text-xs font-medium mb-1">Batch Size</label>
                                <input
                                    type="number"
                                    className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-primary/50"
                                    value={workload.batch_size}
                                    onChange={(e) => setWorkload({ ...workload, batch_size: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div>
                                <label className="block text-subtext text-xs font-medium mb-1">Parameters (B)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-primary/50"
                                    value={workload.parameters_billion}
                                    onChange={(e) => setWorkload({ ...workload, parameters_billion: parseFloat(e.target.value) || 1.0 })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-subtext text-xs font-medium mb-1">Precision</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-primary/50 appearance-none"
                                    value={workload.precision_mode}
                                    onChange={(e) => setWorkload({ ...workload, precision_mode: e.target.value })}
                                >
                                    <option>FP32</option>
                                    <option>FP16</option>
                                    <option>INT8</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-subtext pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-subtext text-xs font-medium mb-1">SLA Target</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        placeholder="Hrs"
                                        className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-primary/50"
                                        value={workload.deadline_hours}
                                        onChange={(e) => setWorkload({ ...workload, deadline_hours: parseFloat(e.target.value) || 1.0 })}
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <select
                                        className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm text-black focus:outline-none focus:border-primary/50 appearance-none"
                                        value={workload.priority}
                                        onChange={(e) => setWorkload({ ...workload, priority: e.target.value })}
                                    >
                                        <option value="high">High</option>
                                        <option value="normal">Normal</option>
                                        <option value="low">Low</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-subtext pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-md font-medium transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Job"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Metrics & Chart */}
                <div className="flex-1 space-y-4">
                    {/* Estimated Resource Requirements */}
                    <div className="bg-surface/50 border border-border p-3 rounded-lg">
                        <h3 className="text-sm font-medium text-text mb-3">Estimated Resource Requirements</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-subtext text-xs">
                                    <Cpu className="w-3.5 h-3.5" /> FLOPs
                                </div>
                                <div className="font-mono text-sm text-text">{estGflops}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-subtext text-xs">
                                    <MemoryStick className="w-3.5 h-3.5" /> Memory Req
                                </div>
                                <div className="font-mono text-sm pl-2">
                                    <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-xs border border-blue-500/30">{memReq}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-subtext text-xs">
                                    <Zap className="w-3.5 h-3.5" /> Comm Link
                                </div>
                                <div className="font-mono text-sm pl-2">
                                    <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded text-xs border border-purple-500/30">{results ? (results.execution_strategy?.pipeline_parallel_degree > 1 ? "Active" : "Idle") : "-"}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-subtext text-xs">
                                    <ZapOff className="w-3.5 h-3.5" /> Power Draw
                                </div>
                                <div className="font-mono text-sm pl-2">
                                    <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-xs border border-orange-500/30">{powerLim}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reinforcement Scheduling Policy Chart */}
                    <div>
                        <h3 className="text-sm font-medium text-subtext mb-2">Policy Time-Series (Energy)</h3>
                        <div className="h-40 bg-surface/30 border border-border rounded-lg p-2 min-h-0 flex flex-col">
                            {results ? (
                                <div className="flex-1 relative">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <LineChart data={schedulingData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27273a" vertical={false} />
                                            <XAxis dataKey="time" hide />
                                            <YAxis hide domain={['dataMin', 'dataMax + 10']} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '12px' }}
                                                itemStyle={{ color: '#06b6d4' }}
                                                labelStyle={{ display: 'none' }}
                                                formatter={(value: any) => [`${Math.round(value as number)} J`, 'Energy']}
                                            />
                                            <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs text-subtext/50 font-mono">
                                    Awaiting Execution...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Pending Jobs Queue (replaces old table with a simpler list matching wireframe) */}
            <div className="pt-2 border-t border-border mt-auto">
                <h3 className="text-xs font-medium text-text mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-500" /> Pending Jobs Queue
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-subtext">
                        <thead className="border-b border-border/50 text-[10px] uppercase">
                            <tr>
                                <th className="font-normal py-1 w-16">&lt; JOB ID</th>
                                <th className="font-normal py-1">Model</th>
                                <th className="font-normal py-1">Batch</th>
                                <th className="font-normal py-1">Status</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono">
                            {results ? (
                                <tr className="border-b border-border/30 bg-primary/10">
                                    <td className="py-1.5 text-primary">{results.workload_features?.job_id}</td>
                                    <td className="py-1.5 text-text">{results.workload_features?.model_file_path || workload.model_file_path}</td>
                                    <td className="py-1.5 text-text">{results.workload_features?.batch_size}</td>
                                    <td className="py-1.5"><span className="text-green-400">Optimizing</span></td>
                                </tr>
                            ) : (
                                <tr className="border-b border-border/30 hover:bg-surface-hover/50">
                                    <td className="py-1.5 text-text">...</td>
                                    <td className="py-1.5">No Active Jobs</td>
                                    <td className="py-1.5">-</td>
                                    <td className="py-1.5"><span className="text-subtext">Idle</span></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
