import { useEffect, useState } from 'react';
import { fetchExplanation } from '../api/client';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle, BrainCircuit, Network } from 'lucide-react';
import { motion } from 'framer-motion';

export const OptimizationDashboard = ({ results, capability }: any) => {
    const [explainData, setExplainData] = useState<any>(null);

    useEffect(() => {
        if (results?.workload_features?.job_id) {
            fetchExplanation(results.workload_features.job_id).then(setExplainData).catch(console.error);
        }
    }, [results]);

    if (!results || !capability) return null;

    const isGPU = capability.gpu_available;
    const isMultiGPU = capability.multi_gpu;

    // Radar formatting
    const metrics = results.final_estimated_metrics;
    const latency_val = Math.min(100, (metrics?.estimated_final_latency_ms || 10) / 1000);
    const energy_val = Math.min(100, (results.prediction?.predicted_energy_j || 10) / 1000);
    const throughput_val = Math.min(100, metrics?.estimated_final_throughput_req_sec || 0);
    const carbon_val = capability.power_monitoring_available ? Math.min(100, (results.hardware_state?.carbon_signal_gco2_kwh || 0) / 10) : 0;

    // Normalizing SLA risk for UI (just an abstract inverse map)
    const sla_risk = explainData?.primary_bottleneck === "SLA-Bound" ? 100 : Math.min(80, latency_val * 2);

    const radarData = [
        { subject: 'Latency Risk', A: latency_val, fullMark: 100 },
        { subject: 'Throughput', A: throughput_val, fullMark: 100 },
        { subject: 'Energy Use', A: energy_val, fullMark: 100 },
        { subject: 'SLA Risk', A: sla_risk, fullMark: 100 },
        { subject: 'Carbon Emit', A: carbon_val, fullMark: 100 }
    ];

    // RL extraction
    const sched = results.scheduling_decision;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">

            {/* Dynamic Bottleneck Badge */}
            <div className="lg:col-span-2">
                {explainData?.primary_bottleneck === "SLA-Bound" && (
                    <div className="bg-red-500/10 border border-red-500 p-4 rounded-xl flex items-center text-red-500 font-semibold shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                        <AlertCircle className="mr-3 w-6 h-6 animate-pulse" />
                        🚨 SLA Breach — Exponential Penalty Activated
                    </div>
                )}
                {explainData?.primary_bottleneck === "Memory-Bound" && (
                    <div className="bg-amber-500/10 border border-amber-500 p-4 rounded-xl flex items-center text-amber-500 font-semibold">
                        <AlertCircle className="mr-3 w-6 h-6 animate-pulse" />
                        ⚠ Memory Ceiling Reached — Model Parallelism Required
                    </div>
                )}
                {explainData?.primary_bottleneck === "Communication-Bound" && isMultiGPU && (
                    <div className="bg-blue-500/10 border border-blue-500 p-4 rounded-xl flex items-center text-blue-400 font-semibold">
                        <Network className="mr-3 w-6 h-6" />
                        🌐 Comm-Bound Topology — Over-scaling Penalties
                    </div>
                )}
            </div>

            {/* RL Intelligence Panel */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-surface border border-border/50 rounded-xl relative overflow-hidden">
                <h3 className="font-semibold text-lg mb-4 flex items-center relative z-10 text-primary">
                    <BrainCircuit className="w-5 h-5 mr-2" /> RL Autonomy State
                </h3>
                <div className="space-y-3 relative z-10 text-sm">
                    <div className="flex justify-between">
                        <span className="text-subtext">Action Space Map:</span>
                        <span className="font-mono text-[11px] text-blue-400">
                            {isGPU ? "[1, 2, 4, 8, 16, 32, 64]" : "[1 (CPU Index)]"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-subtext">Action (Allocated Nodes):</span>
                        <span className="text-text font-bold text-lg">{sched.allocated_gpus} {isGPU ? 'GPU(s)' : 'CPU Array'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-subtext">Q-Table Cost Reward:</span>
                        <span className="font-mono text-red-400">{sched.reward_score.toExponential(2)}</span>
                    </div>

                    {/* Explain Trace */}
                    {explainData && (
                        <div className="mt-4 p-3 bg-background/50 rounded border border-border/30">
                            <span className="block text-xs text-subtext uppercase mb-1">Execution Reasoning Trace</span>
                            <p className="text-xs text-text italic leading-relaxed">"{explainData.decision_reasoning}"</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Radar Chart Multi-Objective */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 bg-surface border border-border/50 rounded-xl flex flex-col items-center">
                <h3 className="font-semibold text-lg w-full text-left mb-2 text-primary">Multi-Objective Polygon</h3>
                <div className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }} />
                            <Radar name="Strategy Cost" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                {!capability.power_monitoring_available && (
                    <span className="text-[10px] text-amber-500">Carbon axis nullified: Telemetry missing on host logic.</span>
                )}
            </motion.div>

        </div>
    );
};
