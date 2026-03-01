import React, { useState, useEffect } from 'react';
import { Zap, Cpu, MemoryStick } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart as RePieChart, Pie, Cell } from 'recharts';

interface HardwareResourcePanelProps {
    telemetry?: any;
    capability?: any;
    results?: any;
}

export const HardwareResourcePanel: React.FC<HardwareResourcePanelProps> = ({ telemetry, capability, results }) => {
    // Keep a rolling history of telemetry for the charts
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (telemetry) {
            setHistory(prev => {
                const newHist = [...prev, {
                    time: Date.now(),
                    usage: telemetry.gpu_utilization_pct || telemetry.cpu_utilization_pct || 0,
                    power: telemetry.power_draw_w || 0,
                    temp: telemetry.gpu_temperature_c || telemetry.cpu_temperature_c || 0,
                    flops: results?.final_estimated_metrics?.estimated_final_throughput_req_sec || 0,
                    bandwidth: results?.hardware_state?.pcie_bandwidth_gbps || 0
                }];
                return newHist.slice(-24); // Keep last 24 entries
            });
        }
    }, [telemetry, results]);

    const isGPU = capability?.gpu_available;
    const isMultiGPU = capability?.multi_gpu;

    const gpuClusterData = history.length > 0 ? history : Array.from({ length: 24 }, (_, i) => ({ time: i, usage: 0, power: 0, temp: 0, flops: 0, bandwidth: 0 }));

    // Fallback values
    const currentUsage = telemetry ? (isGPU ? telemetry.gpu_utilization_pct : telemetry.cpu_utilization_pct) : 0;
    const currentPower = telemetry?.power_draw_w || 0;
    const currentMem = telemetry ? (isGPU ? telemetry.memory_used_gb : telemetry.ram_used_gb) : 0;

    let totalMem = 24.0;
    if (results?.hardware_state) {
        totalMem = results.hardware_state.physical_memory_used_gb + results.hardware_state.available_memory_gb;
    } else if (!isGPU) {
        totalMem = 32.0;
    }

    const pieData = totalMem > 0 ? [
        { name: 'Used', value: currentMem },
        { name: 'Available', value: totalMem - currentMem }
    ] : [
        { name: 'Used', value: 0 },
        { name: 'Available', value: 100 }
    ];

    const memPercent = totalMem > 0 ? Math.round((currentMem / totalMem) * 100) : 0;

    return (
        <div className="flex flex-col h-full space-y-4 overflow-y-auto pr-2">

            {/* Top row: GPU Cluster Overview & Mini Stats */}
            <div className="grid grid-cols-12 gap-4">
                {/* Left side: GPU Cluster Overview */}
                <div className="col-span-8 bg-surface/50 border border-border rounded-lg p-3 relative overflow-hidden">
                    <h3 className="text-sm font-medium text-text mb-3">{isGPU ? "GPU" : "CPU"} Cluster Overview</h3>
                    <div className="flex gap-6 mb-2 relative z-10">
                        <div>
                            <div className="text-[10px] text-subtext uppercase tracking-wider">Utilization</div>
                            <div className="text-2xl font-bold font-mono text-primary flex items-baseline">
                                {currentUsage?.toFixed(1) || 0}<span className="text-sm border-b-2 border-primary ml-1">%</span>
                            </div>
                            <div className="text-[10px] text-subtext mt-1">{isMultiGPU ? "Multi-Node Avg" : "Single Node"}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-subtext uppercase tracking-wider">Active Nodes</div>
                            <div className="text-2xl font-bold font-mono text-text flex items-baseline">
                                {isMultiGPU ? capability?.gpu_count : 1}<span className="text-sm text-subtext ml-1 opacity-50">/{capability?.gpu_count || 1}</span>
                            </div>
                            <div className="text-[10px] text-subtext mt-1">Nodes Connected</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-subtext uppercase tracking-wider">Total Power Draw</div>
                            <div className="text-2xl font-bold font-mono flex items-baseline text-yellow-500">
                                {currentPower?.toFixed(0) || 0}<span className="text-sm border-b-2 border-yellow-500 ml-1 opacity-80">W</span>
                            </div>
                            <div className="text-[10px] text-subtext mt-1">Total Limit: {capability?.power_limit_w || "-"}W</div>
                        </div>
                    </div>
                    {/* Background Chart */}
                    <div className="absolute bottom-0 right-0 w-2/3 h-16 opacity-30">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={gpuClusterData}>
                                <defs>
                                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="usage" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsage)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right side: ROCm Telemetry mini blocks */}
                <div className="col-span-4 flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-text bg-surface/80 px-2 py-1 rounded">Telemetry Fast-Path</h3>
                    <div className="grid grid-cols-3 gap-2 flex-1">
                        <div className="bg-surface border border-border rounded-lg p-2 flex flex-col justify-center text-center">
                            <div className="text-[10px] text-subtext/70 mb-1">Processors</div>
                            <div className="font-mono text-lg font-bold text-accent">{capability?.gpu_count || 1}<span className="text-[10px] opacity-50 ml-0.5">ins</span></div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-2 flex flex-col justify-center text-center">
                            <div className="text-[10px] text-subtext/70 mb-1">NVLink</div>
                            <div className="font-mono text-[10px] font-bold text-subtext">{capability?.nvlink_available ? "Active" : "None"}</div>
                        </div>
                        <div className="bg-surface border border-border rounded-lg p-2 flex flex-col justify-center text-center">
                            <div className="text-[10px] text-subtext/70 mb-1">Pwr Mon</div>
                            <div className={`font-mono text-sm font-bold ${capability?.power_monitoring_available ? "text-green-400" : "text-subtext"}`}>
                                {capability?.power_monitoring_available ? "ON" : "OFF"}
                            </div>
                        </div>
                    </div>
                    {/* Mini Pie and Line */}
                    <div className="flex bg-surface border border-border rounded-lg p-2 h-16">
                        <div className="w-12 h-12 relative flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <RePieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={15}
                                        outerRadius={22}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={false}
                                    >
                                        <Cell fill="#06b6d4" />
                                        <Cell fill="#27273a" />
                                    </Pie>
                                </RePieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                                {memPercent}%
                            </div>
                        </div>
                        <div className="flex-1 ml-2 relative">
                            <div className="text-[8px] text-subtext uppercase text-right mb-1">System Load History</div>
                            <div className="absolute inset-x-0 bottom-0 top-4">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <LineChart data={gpuClusterData.slice(-10)}>
                                        <Line type="step" dataKey="usage" stroke="#f59e0b" strokeWidth={1} dot={false} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Row: Telemetry Tables */}
            <div className="grid grid-cols-1 gap-4">
                {/* ROCm Telemetry Table */}
                <div className="bg-surface/30 border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-text">Live Hardware Telemetry Stream</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-subtext font-mono">
                            <thead className="border-b border-border/50 text-[10px] uppercase text-subtext/70">
                                <tr>
                                    <th className="font-normal py-1 px-2 text-primary font-bold">Node ID</th>
                                    <th className="font-normal py-1 px-2">Type</th>
                                    <th className="font-normal py-1 px-2">Utilization</th>
                                    <th className="font-normal py-1 px-2">Memory Used</th>
                                    <th className="font-normal py-1 px-2">Power / Temp</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-border/30 hover:bg-surface-hover/50 transition-colors">
                                    <td className="py-2 px-2 text-text flex items-center gap-1">
                                        {isGPU ? <Zap className="w-3 h-3 text-orange-400" /> : <Cpu className="w-3 h-3 text-blue-400" />}
                                        {isMultiGPU ? "Cluster-Avg" : "Local-0"}
                                    </td>
                                    <td className="py-2 px-2">{capability?.gpu_model || "CPU-Bound"}</td>
                                    <td className="py-2 px-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-8">{currentUsage?.toFixed(0)}%</span>
                                            <div className="w-24 h-1.5 bg-surface border border-border rounded-full overflow-hidden">
                                                <div className={`h-full ${currentUsage > 80 ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${currentUsage}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="flex items-center gap-2">
                                            <MemoryStick className="w-3 h-3 text-subtext" />
                                            {currentMem?.toFixed(1)} / {totalMem?.toFixed(1)} GB
                                        </div>
                                    </td>
                                    <td className="py-2 px-2 text-subtext">
                                        {capability?.power_monitoring_available ? `${currentPower?.toFixed(0)}W` : "N/A"}
                                        {isGPU && telemetry?.gpu_temperature_c ? ` / ${telemetry.gpu_temperature_c.toFixed(0)}°C` : ""}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ROCm Hardware Status Table (Split from Telemetry) */}
                <div className="bg-surface/30 border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-text">Hardware Limitations & Constraints</h3>
                        <div className="text-[10px] text-subtext flex items-center gap-2">
                            <span>Status</span>
                            <div className="w-6 h-3 bg-primary/20 rounded-full flex items-center justify-end px-0.5 border border-primary/30">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-subtext font-mono">
                            <thead className="border-b border-border/50 text-[10px] uppercase text-subtext/70">
                                <tr>
                                    <th className="font-normal py-1 px-2">Limit Type</th>
                                    <th className="font-normal py-1 px-2">Detected Value</th>
                                    <th className="font-normal py-1 px-2 text-right">Condition</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-border/30 hover:bg-surface-hover/50">
                                    <td className="py-1.5 px-2">Physical Memory Ceiling</td>
                                    <td className="py-1.5 px-2 text-text">{totalMem?.toFixed(1)} GB</td>
                                    <td className="py-1.5 px-2 text-right text-green-500">Hard Limit</td>
                                </tr>
                                <tr className="border-b border-border/30 hover:bg-surface-hover/50">
                                    <td className="py-1.5 px-2">Max Power Delivery</td>
                                    <td className="py-1.5 px-2 text-text">{capability?.power_limit_w || "Unknown"} W</td>
                                    <td className="py-1.5 px-2 text-right text-green-500">Firmware Linked</td>
                                </tr>
                                <tr className="border-b border-border/30 hover:bg-surface-hover/50">
                                    <td className="py-1.5 px-2">Multi-Node Interconnect</td>
                                    <td className="py-1.5 px-2 text-text">{isMultiGPU ? "Available" : "Absent"}</td>
                                    <td className="py-1.5 px-2 text-right text-orange-500">{isMultiGPU ? "Active" : "Local Restricted"}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Bottom: Performance & Health Metrics Chart */}
            <div className="bg-surface/30 border border-border rounded-lg p-3 flex-1 flex flex-col min-h-[160px]">
                <h3 className="text-sm font-medium text-text mb-2">Performance & Health Metrics History</h3>
                <div className="flex-1 relative mt-2">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart data={gpuClusterData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27273a" vertical={false} />
                            <XAxis dataKey="time" hide />
                            <YAxis yAxisId="left" hide domain={[0, 100]} />
                            <YAxis yAxisId="right" orientation="right" hide domain={[20, 100]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '12px' }}
                            />
                            {/* GFLOPs / Utilization Line */}
                            <Line yAxisId="left" type="step" dataKey="usage" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                            {/* Temp Line (scattered) */}
                            {isGPU && <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={1} dot={false} isAnimationActive={false} />}
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="absolute top-0 right-2 flex flex-col gap-1 text-[8px] font-mono text-subtext/70 bg-surface/80 p-1 rounded border border-border/50">
                        <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-accent inline-block"></span> Load %</div>
                        {isGPU && <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-orange-500 inline-block"></span> Temp</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
