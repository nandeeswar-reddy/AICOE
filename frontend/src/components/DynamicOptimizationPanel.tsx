import React, { useState, useEffect } from 'react';
import { Layers, Zap, Cpu, Search, ChevronRight, Activity, TrendingUp, Settings2 } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface DynamicOptimizationPanelProps {
    results?: any;
}

export const DynamicOptimizationPanel: React.FC<DynamicOptimizationPanelProps> = ({ results }) => {
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (results?.prediction) {
            setHistory(prev => {
                const newHist = [...prev, {
                    time: prev.length,
                    flops: results.prediction.predicted_throughput_req_sec || 0,
                    efficiency: results.prediction.predicted_energy_j || 0
                }];
                // Keep last 20 frames
                return newHist.slice(-20);
            });
        }
    }, [results]);

    const chartData = history.length > 0 ? history : [{ time: 0, flops: 0, efficiency: 0 }];

    const strategy = results?.execution_strategy;
    const scheduling = results?.scheduling_decision;

    // Determine active strategies
    const isDataParallel = strategy?.data_parallel_size && strategy.data_parallel_size > 1;
    const isHybrid = (strategy?.pipeline_parallel_size > 1) || (strategy?.tensor_parallel_size > 1);
    const isRocmOptimized = scheduling?.suggested_precision === "FP16" || scheduling?.suggested_precision === "INT8";
    const isEnergyOpt = results?.hardware_state?.power_usage_w && results.hardware_state.power_usage_w < 300;

    // Map live hardware and execution strategies directly dynamically off API models representing node physics
    const hw = results?.hardware_state;
    const wl = results?.workload_features;
    const metrics = results?.final_estimated_metrics;

    const gpuUtil = Math.round(hw?.utilization_avg_pct || 0);
    const totalVram = (hw?.capability?.gpu_count || 1) * (hw?.capability?.available_memory_gb_per_gpu || 1);
    const vramUtil = Math.round(((hw?.physical_memory_used_gb || 0) / totalVram) * 100) || 0;

    let commRatio = 0;
    if (wl) {
        commRatio = Math.round((wl.communication_volume_mb / (wl.activation_memory_mb + wl.communication_volume_mb)) * 100) || 0;
    }

    let slaRisk = 0;
    if (metrics && wl && wl.deadline_hours > 0) {
        slaRisk = Math.round((metrics.estimated_final_latency_ms / (wl.deadline_hours * 3600 * 1000)) * 100) || 0;
    }

    const p1 = Math.min(100, Math.max(0, gpuUtil));
    const p2 = Math.min(100, Math.max(0, vramUtil));
    const p3 = Math.min(100, Math.max(0, commRatio));
    const p4 = Math.min(100, Math.max(0, slaRisk));

    const pieData1 = [{ name: 'A', value: p1 }, { name: 'B', value: 100 - p1 }];
    const pieData2 = [{ name: 'A', value: p2 }, { name: 'B', value: 100 - p2 }];
    const pieData3 = [{ name: 'A', value: p3 }, { name: 'B', value: 100 - p3 }];
    const pieData4 = [{ name: 'A', value: p4 }, { name: 'B', value: 100 - p4 }];

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header with Search */}
            <div className="flex justify-end mb-2">
                <div className="flex items-center bg-surface-hover border border-border rounded px-2 py-1 relative">
                    <Search className="w-3 h-3 text-subtext mr-2" />
                    <input type="text" placeholder="Search Adjustments..." className="bg-transparent text-[10px] text-text border-none focus:outline-none w-32" />
                </div>
            </div>

            <div className="flex gap-4 flex-1">
                {/* Left Column: Active Jobs & Strategy Advisor */}
                <div className="flex-1 flex flex-col space-y-4">

                    {/* Active Jobs Table */}
                    <div className="bg-surface/30 border border-border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-text">Active Optimization Constraints</h3>
                            <div className="text-[10px] text-subtext flex gap-2">
                                <span className="bg-surface-hover px-2 py-0.5 rounded cursor-pointer hover:text-text transition-colors">Start</span>
                                <span className="bg-surface-hover px-2 py-0.5 rounded cursor-pointer hover:text-text transition-colors">Terminate</span>
                            </div>
                        </div>
                        <table className="w-full text-left text-[10px] text-subtext font-mono">
                            <thead className="border-b border-border/50 uppercase text-subtext/70">
                                <tr>
                                    <th className="font-normal py-1">Rule ID</th>
                                    <th className="font-normal py-1">Type</th>
                                    <th className="font-normal py-1">Target</th>
                                    <th className="font-normal py-1">Status</th>
                                    <th className="font-normal py-1 text-right">Severity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results ? (
                                    <>
                                        <tr className="border-b border-border/10">
                                            <td className="py-1.5 text-text">SLA-01</td>
                                            <td className="py-1.5">Deadline</td>
                                            <td className="py-1.5">{results.workload_features?.deadline_hours || 6}h</td>
                                            <td className="py-1.5 text-green-500">Met</td>
                                            <td className="py-1.5"><div className="w-16 h-1.5 bg-surface ml-auto flex"><div className="h-full bg-blue-500 w-1/4" /></div></td>
                                        </tr>
                                        <tr className="border-b border-border/10">
                                            <td className="py-1.5 text-text">PWR-88</td>
                                            <td className="py-1.5">Power Cap</td>
                                            <td className="py-1.5">Node Pwr Limitation</td>
                                            <td className="py-1.5 text-orange-500">Active</td>
                                            <td className="py-1.5"><div className="w-16 h-1.5 bg-surface ml-auto flex"><div className="h-full bg-orange-500 w-2/3" /></div></td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-center text-subtext/50">No active constraints. Run optimization.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Strategy Advisor (2x2 Grid) */}
                    <div>
                        <h3 className="text-sm font-medium text-text mb-2 flex items-center gap-1"><Settings2 className="w-4 h-4 text-orange-500" /> Derived Strategy Tactics</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className={`border transition-colors rounded-lg p-3 flex flex-col justify-center gap-2 cursor-pointer group ${isDataParallel ? 'bg-primary/10 border-primary' : 'bg-surface border-border opacity-50'}`}>
                                <div className="flex items-center gap-2 text-primary group-hover:scale-105 transition-transform"><Layers className="w-5 h-5" /> <span className="text-sm font-medium">Data Parallelism {isDataParallel ? `(${strategy?.data_parallel_size}x)` : ''}</span></div>
                                <div className="text-[10px] text-subtext leading-tight">Distribute large datasets across multiple nodes automatically.</div>
                            </div>
                            <div className={`border transition-colors rounded-lg p-3 flex flex-col justify-center gap-2 cursor-pointer group ${isHybrid ? 'bg-purple-500/10 border-purple-500' : 'bg-surface border-border opacity-50'}`}>
                                <div className="flex items-center gap-2 text-purple-400 group-hover:scale-105 transition-transform"><Cpu className="w-5 h-5" /> <span className="text-sm font-medium">Hybrid Parallelism</span></div>
                                <div className="text-[10px] text-subtext leading-tight">Combine tensor and pipeline parallelism for LLMs.</div>
                            </div>
                            <div className={`border transition-colors rounded-lg p-3 flex flex-col justify-center gap-2 cursor-pointer group ${isRocmOptimized ? 'bg-blue-500/10 border-blue-500' : 'bg-surface border-border opacity-50'}`}>
                                <div className="flex items-center gap-2 text-blue-400 group-hover:scale-105 transition-transform"><Activity className="w-5 h-5" /> <span className="text-sm font-medium">ROCm Optimization</span></div>
                                <div className="text-[10px] text-subtext leading-tight">Apply AMD-specific kernel tuning and graph optimizations.</div>
                            </div>
                            <div className={`border transition-colors rounded-lg p-3 flex flex-col justify-center gap-2 cursor-pointer group ${isEnergyOpt ? 'bg-green-500/10 border-green-500' : 'bg-surface border-border opacity-50'}`}>
                                <div className="flex items-center gap-2 text-green-400 group-hover:scale-105 transition-transform"><Zap className="w-5 h-5" /> <span className="text-sm font-medium">Energy Optimization</span></div>
                                <div className="text-[10px] text-subtext leading-tight">Dynamic power capping based on SLA requirements.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Opt Actions & Live Metrics */}
                <div className="w-56 flex flex-col space-y-4">

                    {/* Optimization Actions List */}
                    <div className="bg-surface/30 border border-border rounded-lg p-3">
                        <h3 className="text-sm font-medium text-text mb-3">Scheduling Interventions</h3>
                        <div className="space-y-2">
                            {results ? (
                                <>
                                    <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors p-2 rounded cursor-pointer border border-border">
                                        <Layers className="w-4 h-4 text-primary" />
                                        <span className="text-xs text-text flex-1">Allocating {scheduling?.allocated_gpus || 0} GPUs</span>
                                        <ChevronRight className="w-3 h-3 text-subtext" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors p-2 rounded cursor-pointer border border-border">
                                        <Cpu className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-text flex-1">Strategy: {scheduling?.parallel_strategy}</span>
                                        <ChevronRight className="w-3 h-3 text-subtext" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-surface hover:bg-surface-hover transition-colors p-2 rounded cursor-pointer border border-border">
                                        <Activity className="w-4 h-4 text-blue-400" />
                                        <span className="text-xs text-text flex-1">Using {scheduling?.suggested_precision} prec.</span>
                                        <ChevronRight className="w-3 h-3 text-subtext" />
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-subtext/50 py-2">No active interventions.</div>
                            )}
                        </div>
                    </div>

                    {/* Live Optimization Metrics */}
                    <div className="flex-1 bg-surface/30 border border-border rounded-lg p-3 flex flex-col">
                        <h3 className="text-sm font-medium text-text mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> Expected Throughput</h3>

                        {/* Area Chart */}
                        <div className="flex-1 min-h-[80px] mb-2 relative">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorFlops" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 2" stroke="#27273a" vertical={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '10px' }} />
                                    <Area type="monotone" dataKey="flops" stroke="#10b981" fillOpacity={1} fill="url(#colorFlops)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Speedup Circular Indicators */}
                        <div className="flex justify-between items-end mt-auto px-1">
                            {[pieData1, pieData2, pieData3, pieData4].map((data, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <div className="w-10 h-10 relative mb-1">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <PieChart>
                                                <Pie data={data} innerRadius={12} outerRadius={18} paddingAngle={0} dataKey="value" stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
                                                    <Cell fill={idx === 3 ? "#ef4444" : "#06b6d4"} />
                                                    <Cell fill="#27273a" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-text">
                                            {data[0].value}%
                                        </div>
                                    </div>
                                    <div className="text-[8px] text-subtext mt-1 text-center leading-tight">{
                                        idx === 0 ? 'GPU Util' :
                                            idx === 1 ? 'VRAM Alloc' :
                                                idx === 2 ? 'Comm Ratio' : 'SLA Risk'
                                    }</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
