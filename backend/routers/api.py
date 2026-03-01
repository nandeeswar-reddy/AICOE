from fastapi import APIRouter
from models.schemas import (
    WorkloadInput, WorkloadFeatureVector,
    HardwareInput, HardwareStateVector,
    PredictionInput, PredictionOutput,
    SchedulingInput, SchedulingDecision,
    StrategyInput, ExecutionStrategy,
    KernelInput, KernelOptimizations,
    OptimizationInput, FinalDecisionOutput
)
from services.layer1_workload import workload_engine
from services.layer2_hardware import hardware_engine
from services.layer3_predictive import predictive_engine
from services.layer4_rl_scheduler import rl_scheduler
from services.layer5_strategy import strategy_selector
from services.layer6_kernel import kernel_advisor
from services.layer7_aggregator import aggregator

router = APIRouter()

@router.post("/workload/profile", response_model=WorkloadFeatureVector)
async def profile_workload(data: WorkloadInput):
    return workload_engine.profile_workload(data)

@router.post("/hardware/state", response_model=HardwareStateVector)
async def get_hardware_state(data: HardwareInput):
    # Using POST here just because it accepts a body with config/telemetry
    return hardware_engine.get_hardware_state(data)

@router.post("/predict", response_model=PredictionOutput)
async def predict_performance(data: PredictionInput):
    return predictive_engine.predict(data)

@router.post("/schedule", response_model=SchedulingDecision)
async def schedule_workload(data: SchedulingInput):
    return rl_scheduler.schedule(data)

@router.post("/strategy", response_model=ExecutionStrategy)
async def select_strategy(data: StrategyInput):
    return strategy_selector.select_strategy(data)

@router.post("/kernel/optimize", response_model=KernelOptimizations)
async def kernel_optimize(data: KernelInput):
    return kernel_advisor.optimize(data)

@router.post("/optimize", response_model=FinalDecisionOutput)
async def full_optimization(data: OptimizationInput):
    return aggregator.aggregate(data)

from fastapi import HTTPException

@router.get("/explain/{job_id}")
async def explain_decision(job_id: str):
    if job_id not in aggregator.execution_history:
        raise HTTPException(status_code=404, detail="Job ID not found in current orchestration session history.")
        
    result = aggregator.execution_history[job_id]
    capability = result.hardware_state.capability
    
    # Analyze Bottleneck
    bottleneck = "Compute-Bound"
    mem_required = result.workload_features.activation_memory_mb
    mem_available = result.hardware_state.available_memory_gb * 1024
    if mem_required > mem_available * 0.8:
        bottleneck = "Memory-Bound"
    elif hasattr(result.execution_strategy, "reasoning") and "Communication overhead" in result.execution_strategy.reasoning:
        bottleneck = "Communication-Bound"
    
    # Check SLA
    sla_hours = 12.0 # Assume dummy default for UI retrieval simplicity, though it's bound tightly in agg
    sla_ms = sla_hours * 3600 * 1000
    if result.final_estimated_metrics.get("estimated_final_latency_ms", 0) > sla_ms:
        bottleneck = "SLA-Bound"
        
    return {
        "job_id": job_id,
        "hardware_detected_capability": {
            "is_gpu_enabled": capability.gpu_available,
            "detected_gpu_count": capability.gpu_count,
            "multi_gpu_capable": capability.multi_gpu,
            "power_telemetry_enabled": capability.power_monitoring_available
        },
        "primary_bottleneck": bottleneck,
        "reward_score_breakdown": {
            "final_cost_score": result.final_estimated_metrics.get("cost_score_normalized", 0.0),
            "allocated_gpus": result.scheduling_decision.allocated_gpus,
            "strategy": result.execution_strategy.selected_strategy,
            "latency": result.final_estimated_metrics.get("estimated_final_latency_ms", 0.0)
        },
        "decision_reasoning": result.execution_strategy.reasoning,
        "kernel_reasoning": "Batch size tightened" if result.kernel_optimizations.suggested_batch_adjustment < 0 else "Execution flowing smoothly."
    }

import os
import time

@router.get("/capability_profile")
async def capability_profile():
    # Pass dummy input just to get pure hardware resolution
    hw_vector = hardware_engine.get_hardware_state(HardwareInput())
    return hw_vector.capability.dict()

@router.get("/calibration_status")
async def calibration_status():
    from services.layer0_calibration import calibration_engine
    calib = calibration_engine.calibrated_data
    return {
        "calibration_performed": calib is not None,
        "measured_cpu_tflops": calib.get("measured_cpu_tflops", 0) if calib else 0,
        "measured_gpu_tflops": calib.get("measured_gpu_tflops", 0) if calib else 0,
        "measured_memory_bandwidth_gbps": calib.get("measured_memory_bandwidth_gbps", 0) if calib else 0,
        "source": "GPU" if calib and calib.get("has_gpu") else "CPU"
    }

@router.get("/telemetry")
async def get_live_telemetry():
    hw_vector = hardware_engine.get_hardware_state(HardwareInput())
    try:
        import psutil
        cpu_util = psutil.cpu_percent()
        ram_gb = psutil.virtual_memory().used / (1024**3)
        ram_total_gb = psutil.virtual_memory().total / (1024**3)
    except:
        cpu_util = 0
        ram_gb = 0
        ram_total_gb = 16.0
        
    return {
        "gpu_utilization_pct": hw_vector.utilization_avg_pct,
        "memory_used_gb": hw_vector.physical_memory_used_gb,
        "power_draw_w": hw_vector.power_usage_w,
        "cpu_utilization_pct": cpu_util,
        "ram_used_gb": ram_gb,
        "ram_total_gb": ram_total_gb,
        "gpu_temperature_c": hw_vector.gpu_temperature_c,
        "cpu_temperature_c": hw_vector.cpu_temperature_c
    }

@router.get("/rl_status")
async def get_rl_status():
    from services.layer4_rl_scheduler import rl_scheduler
    exists = os.path.exists(rl_scheduler.q_table_path)
    mod_time = "Unknown"
    if exists:
        mod_time_epoch = os.path.getmtime(rl_scheduler.q_table_path)
        mod_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mod_time_epoch))
    
    return {
        "q_table_found": exists,
        "last_modified": mod_time,
        "states_stored": len(rl_scheduler.q_table),
        "policy_version": "v2.0-Adaptive"
    }
