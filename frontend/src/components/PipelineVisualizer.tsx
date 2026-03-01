import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

interface PipelineVisualizerProps {
    results: any;
    isLoading: boolean;
}

const LAYERS = [
    { id: 'workload_features', name: 'L1: Workload Intelligence', color: 'text-blue-400' },
    { id: 'hardware_state', name: 'L2: Hardware Intelligence', color: 'text-green-400' },
    { id: 'prediction', name: 'L3: Predictive Performance', color: 'text-yellow-400' },
    { id: 'scheduling_decision', name: 'L4: RL Scheduler', color: 'text-red-400' },
    { id: 'execution_strategy', name: 'L5: Strategy Selector', color: 'text-purple-400' },
    { id: 'kernel_optimizations', name: 'L6: Kernel Optimizer', color: 'text-orange-400' },
    { id: 'final_estimated_metrics', name: 'L7: Final Decision', color: 'text-cyan-400' },
];

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ results, isLoading }) => {

    return (
        <div className="glass-panel p-6 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center">
                <span className="bg-primary/20 text-primary px-3 py-1 rounded-md text-sm mr-3">AICOE-X</span>
                Optimization Pipeline
            </h2>

            <div className="space-y-4 relative">
                {LAYERS.map((layer, index) => {
                    const isComplete = results && results[layer.id];
                    const isCurrent = isLoading && !isComplete && (index === 0 || (results && results[LAYERS[index - 1].id]));

                    return (
                        <motion.div
                            key={layer.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items - start space - x - 4 p - 4 rounded - lg border ${isComplete ? 'bg-surface/80 border-border' :
                                    isCurrent ? 'bg-primary/10 border-primary/50 animate-pulse-slow' : 'bg-background/30 border-transparent opacity-50'
                                } `}
                        >
                            <div className="mt-1">
                                {isComplete ? (
                                    <CheckCircle2 className={layer.color} size={20} />
                                ) : isCurrent ? (
                                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                ) : (
                                    <Circle className="text-subtext" size={20} />
                                )}
                            </div>

                            <div className="flex-grow">
                                <h4 className={`font - semibold ${isComplete ? 'text-text' : 'text-subtext'} `}>
                                    {layer.name}
                                </h4>

                                {isComplete && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="mt-2 text-xs text-subtext bg-black/30 p-2 rounded max-h-32 overflow-y-auto font-mono"
                                    >
                                        <pre>{JSON.stringify(results[layer.id], null, 2)}</pre>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
