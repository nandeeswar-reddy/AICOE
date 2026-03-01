from models.schemas import PredictionInput, PredictionOutput
from services.layer0_calibration import calibration_engine

class PredictivePerformanceEngine:
    def predict(self, input_data: PredictionInput) -> PredictionOutput:
        workload = input_data.workload
        hardware = input_data.hardware
        capability = hardware.capability
        
        calib = calibration_engine.calibrated_data
        
        # Layer 3: Unclamped Multi-Factor Prediction Math (Hardware Autonomy)
        
        # 1. Compute Time Boundaries
        compute_time_sec = 0.0
        
        if capability.gpu_available and hardware.available_gpus > 0:
            # GPU Mode
            base_tflops_per_device = calib.get("measured_gpu_tflops", 312.0)
            if base_tflops_per_device <= 0: base_tflops_per_device = 312.0 
            
            effective_gpu_tflops = max(0.01, base_tflops_per_device * (1.0 - (hardware.utilization_avg_pct / 100.0)))
            
            # Incorporate physical dispatch overheads and framework (PyTorch) latency penalties 
            kernel_dispatch_overhead_sec = 0.000015 * 1024 # Real-world CUDA launch penalty baseline for generic batches
            base_compute_sec = workload.total_flops / (hardware.available_gpus * effective_gpu_tflops * 1e12)
            compute_time_sec = base_compute_sec + kernel_dispatch_overhead_sec
        else:
            # CPU-Only Default Fallback Route
            base_tflops = calib.get("measured_cpu_tflops", 0.05)
            # Assuming linear CPU parallel scale
            cpu_bound_tflops = max(0.001, base_tflops * (hardware.available_cpu_cores / 4.0)) 
            compute_time_sec = workload.total_flops / (cpu_bound_tflops * 1e12)
            
        # 2. Communication Overhead (Network & Memory)
        comm_transfer_sec = 0.0
        memory_transfer_sec = 0.0
        
        if capability.gpu_available and hardware.available_gpus > 0:
            # Try to grab synthetic bandwidth from startup calibration
            memory_bandwidth_gbps = calib.get("measured_memory_bandwidth_gbps", 2000.0) * hardware.available_gpus
            if memory_bandwidth_gbps <= 0: memory_bandwidth_gbps = 2000.0 * hardware.available_gpus
            
            memory_transfer_sec = (workload.activation_memory_mb / 1024.0) / memory_bandwidth_gbps
            
            # Pure Interconnect bound exclusively scales if MULTI-GPU bounds exist
            if capability.multi_gpu and hardware.available_gpus > 1:
                # NVLink is 600GB/s vs PCIe is ~64GB/s
                interconnect_bandwidth = 600.0 if capability.nvlink_available else 64.0
                comm_transfer_sec = (workload.communication_volume_mb / 1024.0) / interconnect_bandwidth
        else:
             # CPU Memory bandwidth (~50GB/s)
            memory_bandwidth_gbps = 50.0 
            memory_transfer_sec = (workload.activation_memory_mb / 1024.0) / memory_bandwidth_gbps
            # Comm time is zero for CPU isolated run
            comm_transfer_sec = 0.0
            
        # 3. Aggregated Unclamped Latency
        latency_sec = compute_time_sec + memory_transfer_sec + comm_transfer_sec
        latency_ms = max(0.01, latency_sec * 1000.0)
        
        # 4. Energy Model
        energy_j = max(0.1, hardware.power_usage_w * latency_sec)
        
        # 5. Throughput
        # Items inferred/trained per second
        throughput = max(0.01, 1.0 / latency_sec)
        
        # Dynamic uncertainty based on variance
        uncertainty = 2.0 + (hardware.utilization_avg_pct * 0.1)
        if not capability.power_monitoring_available:
            uncertainty += 5.0 # Higher statistical drift without live wattage hooks
            
        return PredictionOutput(
            predicted_latency_ms=latency_ms,
            predicted_energy_j=energy_j,
            predicted_throughput_req_sec=throughput,
            uncertainty_range_pct=uncertainty
        )

predictive_engine = PredictivePerformanceEngine()
