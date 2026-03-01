from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import math

# --- LAYER 1: Workload Intelligence ---
class WorkloadInput(BaseModel):
    job_id: str = Field(default="test_job_001")
    framework: str = Field(default="pytorch")
    model_file_path: str = Field(default="production_model.pt")
    batch_size: int = Field(default=64, gt=0)
    training_mode: bool = Field(default=True)
    precision_mode: str = Field(default="FP16")
    deadline_hours: float = Field(default=6.0, gt=0.0)
    priority: str = Field(default="high")
    parameters_billion: float = Field(default=1.5, gt=0.0)

class WorkloadFeatureVector(BaseModel):
    total_flops: float = Field(gt=0.0)
    activation_memory_mb: float = Field(ge=0.0)
    communication_volume_mb: float = Field(ge=0.0)
    arithmetic_intensity: float = Field(ge=0.0)
    parallelism_options: List[str]

class HardwareInput(BaseModel):
    pass

class CapabilityProfile(BaseModel):
    cpu_available: bool
    gpu_available: bool
    gpu_count: int
    multi_gpu: bool
    nvlink_available: bool
    power_monitoring_available: bool

class HardwareStateVector(BaseModel):
    capability: CapabilityProfile
    available_gpus: int = Field(ge=0)
    available_memory_gb: float = Field(ge=0.0)
    utilization_avg_pct: float = Field(ge=0.0, le=100.0)
    available_cpu_cores: int = Field(ge=0)
    power_usage_w: float = Field(default=0.0, ge=0.0)
    carbon_signal_gco2_kwh: float = Field(default=0.0, ge=0.0)
    physical_memory_used_gb: float = Field(default=0.0, ge=0.0)
    gpu_temperature_c: float = Field(default=0.0, ge=0.0)
    cpu_temperature_c: float = Field(default=0.0, ge=0.0)

# --- LAYER 3: Predictive Performance ---
class PredictionInput(BaseModel):
    workload: WorkloadFeatureVector
    hardware: HardwareStateVector

class PredictionOutput(BaseModel):
    predicted_latency_ms: float = Field(gt=0.0)
    predicted_energy_j: float = Field(gt=0.0)
    predicted_throughput_req_sec: float = Field(gt=0.0)
    uncertainty_range_pct: float = Field(default=10.0)

# --- LAYER 4: RL Scheduler ---
class SchedulingDecision(BaseModel):
    allocated_gpus: int = Field(gt=0)
    allocated_cpu_cores: int = Field(gt=0)
    parallel_strategy: str
    suggested_precision: str
    reward_score: float

class SchedulingInput(BaseModel):
    workload: WorkloadFeatureVector
    hardware: HardwareStateVector
    prediction: PredictionOutput

# --- LAYER 5: Execution Strategy ---
class StrategyInput(BaseModel):
    workload: WorkloadFeatureVector
    hardware: HardwareStateVector
    scheduling: SchedulingDecision
    prediction: PredictionOutput

class ExecutionStrategy(BaseModel):
    selected_strategy: str
    tensor_parallel_size: int = 1
    pipeline_parallel_size: int = 1
    data_parallel_size: int = 1
    reasoning: str

# --- LAYER 6: Kernel Optimization ---
class KernelInput(BaseModel):
    workload: WorkloadFeatureVector
    strategy: ExecutionStrategy

class KernelOptimizations(BaseModel):
    operator_fusion_recommended: bool
    suggested_mixed_precision: bool
    tiling_size: int
    suggested_batch_adjustment: int

# --- LAYER 7: Final Decision ---
class OptimizationInput(BaseModel):
    workload_input: WorkloadInput
    hardware_input: HardwareInput

class FinalDecisionOutput(BaseModel):
    workload_features: WorkloadFeatureVector
    hardware_state: HardwareStateVector
    prediction: PredictionOutput
    scheduling_decision: SchedulingDecision
    execution_strategy: ExecutionStrategy
    kernel_optimizations: KernelOptimizations
    final_estimated_metrics: Dict[str, float]
