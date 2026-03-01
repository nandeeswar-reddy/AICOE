from models.schemas import WorkloadInput, WorkloadFeatureVector
import os
import gc

class WorkloadIntelligenceEngine:
    def profile_workload(self, input_data: WorkloadInput) -> WorkloadFeatureVector:
        # Layer 1: Geometric Workload Profiling & Real FvCore Inference
        
        # Determine actual precision bytes
        precision = input_data.precision_mode.upper()
        bytes_per_param = 4.0 if precision == "FP32" else (2.0 if precision in ["FP16", "BF16"] else 1.0)
        
        # Fallback Geometric Analysis
        # Dense Transformer approximation: 2 FLOPs per param per token
        seq_len = 2048.0
        tokens_per_batch = input_data.batch_size * seq_len
        
        flops_per_token = (2.0 if not input_data.training_mode else 6.0) * (input_data.parameters_billion * 1e9)
        total_flops = flops_per_token * tokens_per_batch
            
        # 3. Geometric Component Memory Calculation
        weight_memory_mb = (input_data.parameters_billion * 1000 * bytes_per_param)
        opt_memory_mb = (input_data.parameters_billion * 1000 * 8.0) if input_data.training_mode else 0.0
        
        seq_len = 2048.0
        tokens_per_batch = input_data.batch_size * seq_len
        activation_memory_mb = (tokens_per_batch * input_data.parameters_billion * 1000 * (34.0 if input_data.training_mode else 2.0)) / (1024 * 1024)
        
        total_activation_memory_mb = weight_memory_mb + opt_memory_mb + activation_memory_mb
        
        # 4. Realistic Communication Volume (Only relevant dynamically calculated if GPUs > 1 later)
        grad_sync_mb = (input_data.parameters_billion * 1000 * 2.0) if input_data.training_mode else 0.0
        activation_comm_mb = (tokens_per_batch * 4.0 * 1024) / (1024 * 1024) 
        total_comm_volume_mb = grad_sync_mb + activation_comm_mb
        
        # 5. Arithmetic Intensity (FLOPs / Bytes)
        total_data_movement_bytes = (total_activation_memory_mb * 1024 * 1024) + (total_comm_volume_mb * 1024 * 1024)
        intensity = total_flops / total_data_movement_bytes if total_data_movement_bytes > 0 else 0
        
        strategies = ["Data Parallel", "Pipeline Parallel", "Tensor Parallel"]
        
        return WorkloadFeatureVector(
            total_flops=total_flops,
            activation_memory_mb=total_activation_memory_mb,
            communication_volume_mb=total_comm_volume_mb,
            arithmetic_intensity=intensity,
            parallelism_options=strategies
        )

workload_engine = WorkloadIntelligenceEngine()
