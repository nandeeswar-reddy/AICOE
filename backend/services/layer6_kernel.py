from models.schemas import KernelInput, KernelOptimizations

class KernelOptimizationAdvisor:
    def optimize(self, input_data: KernelInput, precision_mode: str = "FP16") -> KernelOptimizations:
        workload = input_data.workload
        
        # Layer 6: Mathematical Kernel Advisor mapped to precision architecture and boundaries
        
        fusion = True
        mixed_precision = False
        tiling = 64
        batch_adjustment = 0
        
        # If arithmetic intensity is massively memory constrained (< 50 FLOPS/Byte usually signals bound)
        if workload.arithmetic_intensity < 50.0:
            fusion = True # Fuse ops strictly to prevent cache spillage memory reads
            tiling = 64 # Small tiling for local cache bounds
        else:
            fusion = False if workload.total_flops > 1e14 else True
            tiling = 256 # Higher bound dense compute
            
        # Mixed precision solely derived from real inputs
        if precision_mode.upper() == "FP32":
            mixed_precision = True
            
        # Adjust batch strictly on mathematical memory overhead proxy
        if workload.activation_memory_mb > 60000:
            batch_adjustment = -16
        elif workload.activation_memory_mb > 30000:
            batch_adjustment = -8
        else:
            batch_adjustment = 0 # Plenty of physical headroom, maintain batch
            
        return KernelOptimizations(
            operator_fusion_recommended=fusion,
            suggested_mixed_precision=mixed_precision,
            tiling_size=tiling,
            suggested_batch_adjustment=batch_adjustment
        )

kernel_advisor = KernelOptimizationAdvisor()
