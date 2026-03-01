import { useEffect, useState } from 'react';
import { fetchCapabilityProfile, fetchTelemetry, fetchCalibrationStatus, fetchRLStatus } from '../api/client';
import { Cpu, Gpu, Zap, Database, CheckCircle, AlertTriangle } from 'lucide-react';

export const CapabilityPanel = ({ capability, setCapability }: any) => {
    const [telemetry, setTelemetry] = useState<any>(null);
    const [calibration, setCalibration] = useState<any>(null);
    const [rlStatus, setRlStatus] = useState<any>(null);

    useEffect(() => {
        fetchCapabilityProfile().then(setCapability).catch(console.error);
        fetchCalibrationStatus().then(setCalibration).catch(console.error);
        fetchRLStatus().then(setRlStatus).catch(console.error);

        // Initial and polling telemetry
        fetchTelemetry().then(setTelemetry).catch(console.error);
        const interval = setInterval(() => {
            fetchTelemetry().then(setTelemetry).catch(console.error);
            fetchRLStatus().then(setRlStatus).catch(console.error);
        }, 2000);
        return () => clearInterval(interval);
    }, [setCapability]);

    if (!capability || !telemetry) return <div className="animate-pulse bg-surface p-6 rounded-xl border border-border/50 h-32"></div>;

    const isGPU = capability.gpu_available;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Capability Profile */}
            <div className={`p-4 rounded-xl border ${isGPU ? 'border-primary/50 bg-primary/10' : 'border-amber-500/50 bg-amber-500/10'}`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{isGPU ? (capability.multi_gpu ? "Multi-GPU Active" : "Single GPU Active") : "CPU-Only Mode Active"}</h3>
                    {isGPU ? <Gpu className="w-5 h-5 text-primary" /> : <Cpu className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="text-sm text-subtext space-y-1 mt-3">
                    {isGPU && <div>GPU Count: <span className="text-text">{capability.gpu_count}</span></div>}
                    {isGPU && <div>NVLink: <span className="text-text">{capability.nvlink_available ? 'Yes' : 'No'}</span></div>}
                    <div>Telemetry: <span className="text-text">{capability.power_monitoring_available ? 'Enabled' : 'Disabled'}</span></div>
                </div>
            </div>

            {/* Live Telemetry */}
            <div className="p-4 rounded-xl border border-border/50 bg-surface">
                <h3 className="font-semibold mb-3 flex items-center"><ActivityIcon className="w-4 h-4 mr-2 text-blue-400" /> Live Telemetry</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-subtext">
                    {isGPU ? (
                        <>
                            <div>GPU Util: <span className="text-text font-mono">{telemetry.gpu_utilization_pct.toFixed(1)}%</span></div>
                            <div>GPU Mem: <span className="text-text font-mono">{telemetry.memory_used_gb.toFixed(1)} GB</span></div>
                            {capability.power_monitoring_available && (
                                <div>Power: <span className="text-text font-mono">{telemetry.power_draw_w.toFixed(0)} W</span></div>
                            )}
                        </>
                    ) : (
                        <>
                            <div>CPU Util: <span className="text-text font-mono">{telemetry.cpu_utilization_pct.toFixed(1)}%</span></div>
                            <div>System RAM: <span className="text-text font-mono">{telemetry.ram_used_gb.toFixed(1)} GB</span></div>
                        </>
                    )}
                </div>
            </div>

            {/* Calibration Status */}
            <div className="p-4 rounded-xl border border-border/50 bg-surface">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold flex items-center"><Zap className="w-4 h-4 mr-2 text-yellow-400" /> Calibration</h3>
                    {calibration?.calibration_performed ?
                        <CheckCircle className="w-4 h-4 text-green-500" /> :
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    }
                </div>
                {calibration && calibration.calibration_performed ? (
                    <div className="text-sm text-subtext space-y-1 mt-2">
                        <div>Source: <span className="text-text">{calibration.source} physical limits</span></div>
                        <div>Measured limits:</div>
                        <div className="font-mono text-xs">{calibration.source === "GPU" ? calibration.measured_gpu_tflops.toFixed(1) : calibration.measured_cpu_tflops.toFixed(2)} TFLOPs max</div>
                        <div className="font-mono text-xs">{calibration.measured_memory_bandwidth_gbps.toFixed(1)} GB/s Bandwidth</div>
                    </div>
                ) : (
                    <div className="text-sm text-amber-500 mt-2">No physical calibration found. Using baseline heuristics.</div>
                )}
            </div>

            {/* RL Persistence */}
            <div className="p-4 rounded-xl border border-border/50 bg-surface">
                <h3 className="font-semibold mb-2 flex items-center"><Database className="w-4 h-4 mr-2 text-purple-400" /> RL Persistence</h3>
                {rlStatus ? (
                    <div className="text-sm text-subtext space-y-1 mt-2">
                        <div className="flex justify-between">
                            <span>q_table.json:</span>
                            <span className={rlStatus.q_table_found ? "text-green-400 font-mono" : "text-red-400 font-mono"}>
                                {rlStatus.q_table_found ? "Found" : "Missing"}
                            </span>
                        </div>
                        <div>States Stored: <span className="text-text font-mono">{rlStatus.states_stored}</span></div>
                        <div className="text-xs truncate" title={rlStatus.last_modified}>Modified: {rlStatus.last_modified}</div>
                        <div className="text-xs mt-2 text-purple-400">Policy: {rlStatus.policy_version}</div>
                    </div>
                ) : <span className="text-sm text-subtext text-center w-full block">Fetching...</span>}
            </div>
        </div>
    );
};

// Polyfill minimal Lucide icons 
const ActivityIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
