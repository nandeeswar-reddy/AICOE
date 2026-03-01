from models.schemas import OptimizationInput, FinalDecisionOutput
from services.layer1_workload import workload_engine
from services.layer2_hardware import hardware_engine
from services.layer3_predictive import predictive_engine
from services.layer4_rl_scheduler import rl_scheduler
from services.layer5_strategy import strategy_selector
from services.layer6_kernel import kernel_advisor
from models.schemas import PredictionInput, SchedulingInput, StrategyInput, KernelInput
import math

class FinalDecisionAggregator:
    def __init__(self):
        self.execution_history = {}
        
    def aggregate(self, input_data: OptimizationInput) -> FinalDecisionOutput:
        # Step 1: Workload Intelligence
        workload_vector = workload_engine.profile_workload(input_data.workload_input)
        
        # Step 2: Hardware Intelligence
        hardware_vector = hardware_engine.get_hardware_state(input_data.hardware_input)
        capability = hardware_vector.capability
        
        # Step 3: Predictive Performance
        pred_in = PredictionInput(workload=workload_vector, hardware=hardware_vector)
        prediction = predictive_engine.predict(pred_in)
        
        # Step 4: Persistent RL Scheduler
        sched_in = SchedulingInput(workload=workload_vector, hardware=hardware_vector, prediction=prediction)
        scheduling = rl_scheduler.schedule(sched_in)
        
        # Step 5: Execution Strategy
        strat_in = StrategyInput(workload=workload_vector, hardware=hardware_vector, scheduling=scheduling, prediction=prediction)
        strategy = strategy_selector.select_strategy(strat_in)
        
        # Step 6: Memory Kernel Tuning
        kern_in = KernelInput(workload=workload_vector, strategy=strategy)
        kernel = kernel_advisor.optimize(kern_in, precision_mode=input_data.workload_input.precision_mode)
        
        # Step 7: Conditional Multi-Objective Mapping
        
        # Hardware-scaled metric extraction
        if capability.gpu_available:
            true_latency_ms = prediction.predicted_latency_ms * (hardware_vector.available_gpus / scheduling.allocated_gpus)
            final_latency = true_latency_ms * (0.85 if kernel.operator_fusion_recommended else 1.0)
            
            final_throughput = prediction.predicted_throughput_req_sec * (scheduling.allocated_gpus / hardware_vector.available_gpus)
            final_throughput = final_throughput * (1.2 if kernel.suggested_mixed_precision else 1.0)
            
            final_energy = prediction.predicted_energy_j * (scheduling.allocated_gpus / hardware_vector.available_gpus)
        else:
            final_latency = prediction.predicted_latency_ms
            final_throughput = prediction.predicted_throughput_req_sec
            final_energy = prediction.predicted_energy_j
        
        # Objective weights
        alpha = 1.0 # Latency scalar
        beta = 0.5  # Energy scalar
        gamma = 0.8 # Carbon scalar
        delta = 2.0 # Hardware Cost scalar
        
        sla_hours = input_data.workload_input.deadline_hours
        sla_ms = sla_hours * 3600 * 1000
        
        # EXPLICIT EXPONENTIAL SLA PENALTY
        sla_penalty = 0.0
        if final_latency > sla_ms:
            # Penalty = exp((latency - SLA)/SLA)
            overflow_ratio = (final_latency - sla_ms) / sla_ms
            try:
                # Math ceiling to prevent python float overflow
                sla_penalty = math.exp(min(overflow_ratio * 10.0, 100.0)) * 5000.0
            except OverflowError:
                sla_penalty = float('inf')
                
        # CONDITIONAL CARBON DISABLING
        if not capability.power_monitoring_available:
            gamma = 0.0 # Force mapping to 0 for penalty routing
            hardware_vector.carbon_signal_gco2_kwh = 0.0 
            
        cost_score_normalized = (alpha * final_latency) + (beta * final_energy) + (gamma * hardware_vector.carbon_signal_gco2_kwh * scheduling.allocated_gpus) + (delta * scheduling.allocated_gpus) + sla_penalty
        
        rl_scheduler.q_table[rl_scheduler.discretize_state(sched_in)][str(scheduling.allocated_gpus)] = -cost_score_normalized
        rl_scheduler.save_q_table()
        
        final_metrics = {
            "estimated_final_latency_ms": max(0.01, final_latency),
            "estimated_final_throughput_req_sec": max(0.01, final_throughput),
            "cost_score_normalized": max(0.0, float(cost_score_normalized))
        }
        
        final_output = FinalDecisionOutput(
            workload_features=workload_vector,
            hardware_state=hardware_vector,
            prediction=prediction,
            scheduling_decision=scheduling,
            execution_strategy=strategy,
            kernel_optimizations=kernel,
            final_estimated_metrics=final_metrics
        )
        self.execution_history[input_data.workload_input.job_id] = final_output
        return final_output

aggregator = FinalDecisionAggregator()
