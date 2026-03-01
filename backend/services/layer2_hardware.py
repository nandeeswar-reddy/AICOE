from models.schemas import HardwareInput, HardwareStateVector, CapabilityProfile
from services.layer0_calibration import calibration_engine
import platform
import psutil

HARDWARE_LOCK_MODE = True

class HardwareIntelligenceEngine:
    def __init__(self):
        # We perform internal capability probing on instantiation
        self.os_type = platform.system()
        self._probe_capabilities()

    def _probe_capabilities(self):
        """Probes the physical machine to determine true boundaries. (PHYSICAL STATE RESTORED)"""
        gpu_count_actual = 0
        power_monitoring_actual = False
        nvlink_actual = False
        try:
            import torch
            if torch.cuda.is_available():
                gpu_count_actual = torch.cuda.device_count()
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                _ = pynvml.nvmlDeviceGetPowerUsage(handle)
                power_monitoring_actual = True
            except Exception:
                power_monitoring_actual = False
        except ImportError:
            pass # Gracefully run on CPU
            
        # OS Level fallback check if PyTorch is compiled for CPU only but system physically possesses GPUs
        if gpu_count_actual == 0 and self.os_type == "Windows":
            import subprocess
            try:
                output = subprocess.check_output("wmic path win32_VideoController get name", shell=True).decode()
                # Find discrete GPU brands in WMI output
                gpu_lines = [l for l in output.split('\n') if any(brand in l.upper() for brand in ["NVIDIA", "AMD", "RADEON", "GEFORCE"])]
                if len(gpu_lines) > 0:
                    gpu_count_actual = len(gpu_lines)
            except Exception:
                pass
                
        # Physical Telemetry Fallback (nvidia-smi) for hosts without compiled CUDA PyTorch
        try:
            import subprocess
            output = subprocess.check_output("nvidia-smi -L", shell=True).decode().strip()
            lines = [l for l in output.split('\n') if l.strip()]
            if len(lines) > 0:
                gpu_count_actual = max(gpu_count_actual, len(lines))
                power_monitoring_actual = True
        except Exception:
            pass
        
        self.gpu_available = (gpu_count_actual > 0)
        self.gpu_count = gpu_count_actual
        self.multi_gpu = (gpu_count_actual > 1)
        self.nvlink_available = nvlink_actual 
        self.power_monitoring_available = power_monitoring_actual

    def get_hardware_state(self, input_data: HardwareInput) -> HardwareStateVector:
        if HARDWARE_LOCK_MODE:
            # We strictly ignore any incoming hardware requests and only probe hardware.
            pass
            
        # Determine actual absolute bounds from Layer 0 Calibration
        calib = calibration_engine.calibrated_data
        
        # 1. Fetch True Physical Host Telemetry (nvidia-smi) natively
        real_memory_total_gb = None
        real_power_w = None
        current_gpu_util = 0.0
        current_mem_used_gb = 0.0
        current_gpu_temp = 0.0
        
        if self.power_monitoring_available and self.gpu_available:
            try:
                import subprocess
                output = subprocess.check_output("nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu --format=csv,noheader,nounits", shell=True).decode().strip()
                if output:
                    lines = output.split('\n')
                    total_util = 0.0
                    total_mem_used_mb = 0.0
                    total_mem_total_mb = 0.0
                    total_power_w = 0.0
                    total_temp_c = 0.0
                    valid_gpus = 0
                    for line in lines:
                        parts = line.split(',')
                        if len(parts) >= 5:
                            total_util += float(parts[0].strip())
                            total_mem_used_mb += float(parts[1].strip())
                            total_mem_total_mb += float(parts[2].strip())
                            try:
                                power_val = float(parts[3].strip())
                                total_power_w += power_val
                                temp_val = float(parts[4].strip())
                                total_temp_c += temp_val
                            except ValueError:
                                pass
                            valid_gpus += 1
                            
                    if valid_gpus > 0:
                        current_gpu_util = total_util / valid_gpus
                        current_mem_used_gb = total_mem_used_mb / 1024.0
                        real_memory_total_gb = total_mem_total_mb / 1024.0
                        real_power_w = total_power_w
                        current_gpu_temp = total_temp_c / valid_gpus
            except Exception:
                pass
        
        # We NO LONGER allow Execution Mode scaling. Hardware dictates completely.
        final_gpu_available = self.gpu_available
        final_gpu_count = self.gpu_count
        final_multi_gpu = self.multi_gpu
            
        cp_profile = CapabilityProfile(
            cpu_available=True,
            gpu_available=final_gpu_available,
            gpu_count=final_gpu_count,
            multi_gpu=final_multi_gpu,
            nvlink_available=self.nvlink_available,
            power_monitoring_available=self.power_monitoring_available
        )
            
        # Physical available boundaries
        available_cpu_cores = psutil.cpu_count(logical=True)
        if not cp_profile.gpu_available:
            available_gpus = 0
            available_memory_gb = psutil.virtual_memory().available / (1024**3)
            power_usage = 0.0 # Telemetry typically bounded to GPU APIs
            carbon_signal = 0.0 # Disabled
        else:
            total_gpus = self.gpu_count
            available_gpus = max(1, int(total_gpus * (1 - current_gpu_util / 100.0)))
            
            # Fetch calibration memory bound
            actual_memory_gb_per_gpu = 80.0
            if real_memory_total_gb is not None:
                actual_memory_gb_per_gpu = real_memory_total_gb / total_gpus
            else:
                try:
                    import torch
                    gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                    actual_memory_gb_per_gpu = float(gb)
                except Exception:
                    pass
                
            total_gpu_memory = total_gpus * actual_memory_gb_per_gpu
            available_memory_gb = max(0.0, total_gpu_memory - current_mem_used_gb)
            
            # Strictly enforce physical telemetry, no simulated math fallbacks.
            if cp_profile.power_monitoring_available and real_power_w is not None:
                computed_power_draw = real_power_w # True physical trace, no node inference
            else:
                computed_power_draw = 0.0 # Force 0 if real physical sensor is lacking
                
            # Carbon intensity rigidly bound to physical power execution, no static base offsets
            carbon_intensity = computed_power_draw * 0.428 # Global average gCO2/kWh projection based strictly on real W
                
            power_usage = computed_power_draw
            carbon_signal = carbon_intensity
        
        return HardwareStateVector(
            capability=cp_profile,
            available_gpus=available_gpus,
            available_memory_gb=available_memory_gb,
            utilization_avg_pct=current_gpu_util,
            available_cpu_cores=available_cpu_cores,
            power_usage_w=power_usage,
            carbon_signal_gco2_kwh=carbon_signal,
            physical_memory_used_gb=current_mem_used_gb,
            gpu_temperature_c=current_gpu_temp
        )

hardware_engine = HardwareIntelligenceEngine()
