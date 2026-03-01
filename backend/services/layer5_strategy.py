from models.schemas import StrategyInput, ExecutionStrategy

class ExecutionStrategySelector:
    def select_strategy(self, input_data: StrategyInput) -> ExecutionStrategy:
        workload = input_data.workload
        scheduling = input_data.scheduling
        hardware = input_data.hardware
        prediction = input_data.prediction
        capability = hardware.capability
        
        selected = "Data Parallel"
        tp_size = 1
        pp_size = 1
        dp_size = max(1, scheduling.allocated_gpus)
        reasoning = "Model fits in memory, compute overhead bound mapped to Data Parallel execution."
        
        # Layer 5: Self-Adaptive Hardware Topology Engine
        
        if not capability.gpu_available:
            selected = "CPU-Bound Execution"
            reasoning = "Executing explicitly on CPU. Distributed GPU parallel paths bypassed."
            return ExecutionStrategy(selected_strategy=selected, tensor_parallel_size=1, pipeline_parallel_size=1, data_parallel_size=1, reasoning=reasoning)
            
        if not capability.multi_gpu or scheduling.allocated_gpus <= 1:
            selected = "Single Device Execution"
            reasoning = "Topology constrained to a single compute node. No parallel sharding possible."
            return ExecutionStrategy(selected_strategy=selected, tensor_parallel_size=1, pipeline_parallel_size=1, data_parallel_size=1, reasoning=reasoning)
        
        memory_per_gpu = hardware.available_memory_gb * 1024
        total_memory_required = workload.activation_memory_mb
        
        # Compute physical transfer bounds (GB/s) dynamically off capability
        if capability.gpu_available and capability.gpu_count > 1:
            total_comm_volume_gb = workload.communication_volume_mb / 1024.0
            interconnect_bandwidth_gbps = 600.0 if capability.nvlink_available else 64.0
            comm_time_sec = total_comm_volume_gb / interconnect_bandwidth_gbps
        else:
            comm_time_sec = 0.0
        
        # Extract basic bounds limits
        compute_time_sec = (prediction.predicted_latency_ms / 1000.0) # Approx
        
        if total_memory_required > memory_per_gpu * 0.9:
            # Memory ceiling breached: Requires Model Parallel
            selected = "Model Parallel"
            tp_size = 2 if dp_size >= 2 else 1
            if tp_size > 1:
                dp_size = max(1, dp_size // tp_size)
            reasoning = "Activation/weights exceed single-device threshold. Splitting parameters via Tensor Parallelism."
            
        elif comm_time_sec > compute_time_sec and dp_size >= 4:
            # Communications bound multi-node topology
            selected = "Hybrid"
            pp_size = 2
            dp_size = max(1, dp_size // pp_size)
            reasoning = "Communication overhead exceeds compute time bounds on multiple devices. Falling back to Hybrid logic."
            
        elif workload.arithmetic_intensity > 200 and dp_size > 1:
            selected = "Data Parallel (Compute Dense)"
            reasoning = "Extremely high ratio of compute to memory fetches detected. Data scaling explicitly prioritized."
            
        return ExecutionStrategy(
            selected_strategy=selected,
            tensor_parallel_size=tp_size,
            pipeline_parallel_size=pp_size,
            data_parallel_size=dp_size,
            reasoning=reasoning
        )

strategy_selector = ExecutionStrategySelector()
