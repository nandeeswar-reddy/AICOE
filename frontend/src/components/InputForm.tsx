import React, { useState } from 'react';
import { Settings, Database } from 'lucide-react';

interface InputFormProps {
    onRunOptimization: (workload: any, hardware: any) => void;
    isLoading: boolean;
    capability: any;
}

const defaultWorkload = {
    job_id: "test_job_001",
    framework: "pytorch",
    model_file_path: "production_model.pt",
    batch_size: 64,
    training_mode: true,
    precision_mode: "FP16",
    deadline_hours: 6,
    priority: "high",
    parameters_billion: 1.5
};

export const InputForm: React.FC<InputFormProps> = ({ onRunOptimization, isLoading, capability }) => {
    const [workload, setWorkload] = useState(defaultWorkload);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onRunOptimization(workload, {});
    };

    return (
        <div className="glass-panel p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center space-x-2 mb-6 text-primary">
                <Settings size={24} />
                <h2 className="text-xl font-bold">System Inputs</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-accent border-b border-border pb-2">
                        <Database size={18} />
                        <h3 className="font-semibold">Workload Profile</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-subtext mb-1">Job ID</label>
                            <input
                                className="input-field"
                                value={workload.job_id}
                                onChange={e => setWorkload({ ...workload, job_id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-subtext mb-1">Framework</label>
                            <input
                                className="input-field"
                                value={workload.framework}
                                onChange={e => setWorkload({ ...workload, framework: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-subtext mb-1">Batch Size</label>
                            <input
                                type="number" className="input-field"
                                value={workload.batch_size}
                                onChange={e => setWorkload({ ...workload, batch_size: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-subtext mb-1">Deadline (hrs)</label>
                            <input
                                type="number" className="input-field"
                                value={workload.deadline_hours}
                                onChange={e => setWorkload({ ...workload, deadline_hours: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-subtext mb-1">Precision</label>
                            <select
                                className="input-field"
                                value={workload.precision_mode}
                                onChange={e => setWorkload({ ...workload, precision_mode: e.target.value })}
                            >
                                <option value="FP32">FP32</option>
                                <option value="FP16">FP16</option>
                                <option value="INT8">INT8</option>
                            </select>
                        </div>
                        <div className="col-span-2 flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="training_mode"
                                checked={workload.training_mode}
                                onChange={e => setWorkload({ ...workload, training_mode: e.target.checked })}
                                className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor="training_mode" className="text-sm">Is Training Workload</label>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-secondary border-b border-border pb-2">
                        <Settings size={18} />
                        <h3 className="font-semibold">Hardware Topology Limit</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs text-subtext mb-1">Detected Bounding Mode (Read-Only)</label>
                            <input
                                className="input-field bg-surface cursor-not-allowed opacity-75"
                                disabled
                                value={
                                    !capability ? "Scanning Hardware..." :
                                        !capability.gpu_available ? "CPU Only" :
                                            capability.multi_gpu ? "Multi-GPU Distributed Array" : "Single GPU"
                                }
                            />
                            <p className="text-[10px] text-amber-500 mt-1 italic font-medium">
                                AICOE-X is locked to physical deployment. Proxy masks have been permanently disabled.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full mt-4 flex justify-center items-center h-12"
                >
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        "Run Optimization"
                    )}
                </button>
            </form>
        </div>
    );
};
