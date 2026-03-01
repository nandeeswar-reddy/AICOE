import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

interface AIJobMetricsPanelProps {
    results?: any;
    telemetry?: any;
}

export const AIJobMetricsPanel: React.FC<AIJobMetricsPanelProps> = ({ results, telemetry }) => {
    const [continuousHistory, setContinuousHistory] = useState<any[]>([]);
    const [jobHistory, setJobHistory] = useState<any[]>([]);

    // Continuous tick (every 2 seconds) for System RAM
    useEffect(() => {
        if (telemetry) {
            setContinuousHistory(prev => {
                const newEntry = {
                    time: new Date().toLocaleTimeString(),
                    memory: telemetry.ram_used_gb || 0,
                };
                const newHist = [...prev, newEntry];
                return newHist.slice(-15);
            });
        }
    }, [telemetry]);

    // Discrete tick (triggered only on new JSON payload submission)
    useEffect(() => {
        if (results?.prediction) {
            setJobHistory(prev => {
                const jobId = results?.workload_features?.job_id || "Awaiting Job";
                const newEntry = {
                    id: jobId,
                    time: new Date().toLocaleTimeString(),
                    latency: results.prediction.predicted_latency_ms || 0,
                    throughput: results.prediction.predicted_throughput_req_sec || 0
                };
                const newHist = [...prev, newEntry];
                return newHist.slice(-15);
            });
        }
    }, [results]);

    const continuousChartData = continuousHistory.length > 0 ? continuousHistory : [
        { time: "00:00:00", memory: 0 }
    ];

    const jobChartData = jobHistory.length > 0 ? jobHistory : [
        { id: "None", time: "00:00:00", latency: 0, throughput: 0 }
    ];

    // Bandwidth data mapped strictly to real physical execution consumed by the active job
    let active_rx_gbps = 0;
    let active_tx_gbps = 0;

    if (results?.prediction && results?.workload_features) {
        // Real utilization: (Requests / Sec) * (Communication Volume per Request)
        const comms_gb = results.workload_features.communication_volume_mb / 1024.0;
        const throughput = results.prediction.predicted_throughput_req_sec;
        active_rx_gbps = comms_gb * throughput;
        active_tx_gbps = comms_gb * throughput; // Symmetric assume for scattered reduce
    }

    const bwData = [
        {
            name: `Live Pipeline`,
            rx: active_rx_gbps,
            tx: active_tx_gbps,
        }
    ];

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Top row: Performance Projection (3 line charts) */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-text">Performance Projection</h3>
                    <div className="text-[10px] text-subtext/70 flex gap-2">
                        <span><span className="w-2 h-2 rounded bg-orange-500 inline-block mr-1"></span>Predicted</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {/* Chart 1 */}
                    <div className="bg-surface/30 border border-border rounded-lg p-2 h-28">
                        <div className="text-[10px] text-subtext text-center mb-1">Latency (ms)</div>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={jobChartData}>
                                <CartesianGrid strokeDasharray="2 2" stroke="#27273a" vertical={false} />
                                <YAxis hide domain={['dataMin - (dataMin * 0.1)', 'dataMax + (dataMax * 0.1)']} />
                                <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={1.5} dot={true} isAnimationActive={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '10px' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Chart 2 */}
                    <div className="bg-surface/30 border border-border rounded-lg p-2 h-28">
                        <div className="text-[10px] text-subtext text-center mb-1">Memory (GB)</div>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={continuousChartData}>
                                <CartesianGrid strokeDasharray="2 2" stroke="#27273a" vertical={false} />
                                <YAxis hide domain={['dataMin - (dataMin * 0.1)', 'dataMax + (dataMax * 0.1)']} />
                                <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={1.5} dot={true} isAnimationActive={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '10px' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Chart 3 */}
                    <div className="bg-surface/30 border border-border rounded-lg p-2 h-28">
                        <div className="text-[10px] text-subtext text-center mb-1">Throughput (Req/s)</div>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <LineChart data={jobChartData}>
                                <CartesianGrid strokeDasharray="2 2" stroke="#27273a" vertical={false} />
                                <YAxis hide domain={['dataMin - (dataMin * 0.1)', 'dataMax + (dataMax * 0.1)']} />
                                <Line type="monotone" dataKey="throughput" stroke="#10b981" strokeWidth={1.5} dot={true} isAnimationActive={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '10px' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Middle section: Split between In-Progress Jobs and Power Ranking */}
            <div className="flex gap-4 flex-1">
                {/* In-Progress Jobs Table */}
                <div className="flex-[2] bg-surface/30 border border-border rounded-lg p-3 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-medium text-text mb-2">In-Progress Jobs</h3>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-xs text-subtext font-mono">
                            <thead className="border-b border-border/50 text-[10px] uppercase text-subtext/70">
                                <tr>
                                    <th className="font-normal py-1 px-2">Job ID</th>
                                    <th className="font-normal py-1 px-2">Model</th>
                                    <th className="font-normal py-1 px-2">SLA Target</th>
                                    <th className="font-normal py-1 px-2">Progress</th>
                                    <th className="font-normal py-1 px-2 text-right">ETA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results ? (
                                    <tr className="border-b border-border/30 hover:bg-surface-hover/50">
                                        <td className="py-1 px-2 text-text">{results.workload_features?.job_id || "Active"}</td>
                                        <td className="py-1 px-2">{results.workload_features?.model_file_path || "Unknown"}</td>
                                        <td className="py-1 px-2">{results.workload_features?.deadline_hours ? `${results.workload_features.deadline_hours}h` : 'Optimized'}</td>
                                        <td className="py-1 px-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-primary text-[10px] w-6">100%</span>
                                                <div className="w-16 h-1 bg-surface-hover rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary w-[100%]" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-1 px-2 text-right text-subtext/70">{results.prediction?.predicted_latency_ms ? `${(results.prediction.predicted_latency_ms).toFixed(0)}ms` : 'Real-time'}</td>
                                    </tr>
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-center text-subtext/50">No jobs currently running.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Power Usage Ranking Mini Table */}
                <div className="flex-1 bg-surface/30 border border-border rounded-lg p-3 overflow-hidden">
                    <h3 className="text-sm font-medium text-text mb-2">Power Usage</h3>
                    <table className="w-full text-left text-[10px] text-subtext font-mono">
                        <thead className="border-b border-border/50 uppercase text-subtext/50">
                            <tr>
                                <th className="font-normal pb-1">Node</th>
                                <th className="font-normal pb-1">Watts</th>
                                <th className="font-normal pb-1 text-right">Trend</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/10">
                                <td className="py-1">Node 0</td>
                                <td className="py-1 text-yellow-500">{results ? (results.hardware_state?.power_usage_w?.toFixed(0) || "0") : "0"}W</td>
                                <td className="py-1 text-right flex justify-end items-center"><div className={`h-1 ml-auto ${results ? "w-6 bg-gradient-to-r from-red-500 to-yellow-500" : "w-2 bg-subtext/20"}`} /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Row: ROCm Bandwidth Heatmap representation */}
            <div className="bg-surface/30 border border-border rounded-lg p-3 h-48 shrink-0 flex flex-col">
                <div className="flex justify-between items-center mb-1 shrink-0">
                    <h3 className="text-sm font-medium text-text">ROCm Bandwidth Heatmap</h3>
                    <div className="text-[10px] text-subtext flex gap-2">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-sm"></span> RX</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-sm"></span> TX</span>
                    </div>
                </div>
                <div className="flex-1 mt-2 min-h-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={bwData} barGap={0}>
                            <CartesianGrid strokeDasharray="1 3" stroke="#27273a" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ backgroundColor: '#12121c', borderColor: '#27273a', fontSize: '10px' }} cursor={{ fill: '#27273a', opacity: 0.4 }} />
                            <Bar dataKey="rx" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                            <Bar dataKey="tx" fill="#8b5cf6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
};
