import random
import os
import json
from models.schemas import SchedulingInput, SchedulingDecision

class RLSchedulerEngine:
    def __init__(self):
        self.persistence_dir = os.path.join(os.getcwd(), 'persistence')
        os.makedirs(self.persistence_dir, exist_ok=True)
        self.q_table_path = os.path.join(self.persistence_dir, "q_table.json")
        self.q_table = self.load_q_table()
        
        self.alpha = 0.1  # Learning rate
        self.gamma = 0.9  # Discount factor for future sequences
        self.epsilon = 0.15 # Exploration rate

    def load_q_table(self):
        if os.path.exists(self.q_table_path):
            try:
                with open(self.q_table_path, "r") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def save_q_table(self):
        with open(self.q_table_path, "w") as f:
            json.dump(self.q_table, f)
            
    def discretize_state(self, input_data: SchedulingInput) -> str:
        # Finer-grained, physical-bound aware floating discretization ensures jobs don't blindly overwrite each other
        flops_tier = round(input_data.workload.total_flops / 1e13, 1)
        mem_tier = round(input_data.workload.activation_memory_mb / 10000.0, 1)
        gpu_tier = input_data.hardware.available_gpus
        carbon_tier = round(input_data.hardware.carbon_signal_gco2_kwh / 100.0, 1)
        
        return f"F{flops_tier}_M{mem_tier}_G{gpu_tier}_C{carbon_tier}"

    def get_valid_actions(self, capability):
        # HARDWARE AUTONOMY: Strict Action Space Bounds
        if not capability.gpu_available or capability.gpu_count == 0:
            return [0] # CPU-only execution pool mapped to index 0
            
        powers_of_two = [1, 2, 4, 8, 16, 32, 64]
        physical_limit = capability.gpu_count
        return [g for g in powers_of_two if g <= physical_limit] or [0]

    def schedule(self, input_data: SchedulingInput) -> SchedulingDecision:
        workload = input_data.workload
        hardware = input_data.hardware
        prediction = input_data.prediction
        capability = hardware.capability
        
        state_key = self.discretize_state(input_data)
        if state_key not in self.q_table:
            self.q_table[state_key] = {}
            
        valid_actions = self.get_valid_actions(capability)
        
        # Epsilon-Greedy Action Selection
        if random.random() < self.epsilon or len(self.q_table[state_key]) == 0:
            # Explore randomly from hardware safe valid routes
            action_gpus = random.choice(valid_actions)
        else:
            # Exploit best known action from state mapping, filtering strictly by valid topology bounds
            valid_knowledge = {k: v for k, v in self.q_table[state_key].items() if int(k) in valid_actions}
            if len(valid_knowledge) > 0:
                action_gpus = int(max(valid_knowledge, key=valid_knowledge.get))
            else:
                action_gpus = valid_actions[0]
            
        # Ensure fallback safety using natively validated physical boundaries
        if capability.gpu_available and len(valid_actions) > 0:
            allocated_cpu_cores = max(1, min(hardware.available_cpu_cores, action_gpus * 4))
        else:
            action_gpus = 0 # No GPU path instantiated. Pure CPU fallback.
            allocated_cpu_cores = hardware.available_cpu_cores
        
        action_key = str(action_gpus)
        
        # Real Metric Re-evaluation based on allocated subset (since prediction assumes full use)
        if capability.gpu_available:
            adjusted_latency_ms = prediction.predicted_latency_ms * (hardware.available_gpus / action_gpus)
            adjusted_energy_j = prediction.predicted_energy_j * (action_gpus / hardware.available_gpus)
        else:
            adjusted_latency_ms = prediction.predicted_latency_ms
            adjusted_energy_j = prediction.predicted_energy_j
        
        # Reward Function Integration
        latency_penalty = adjusted_latency_ms * 1.0
        energy_penalty = adjusted_energy_j * 0.5
        
        # Conditional Carbon bound
        if capability.power_monitoring_available:
            carbon_penalty = hardware.carbon_signal_gco2_kwh * 0.8 * action_gpus
        else:
            carbon_penalty = 0.0
        
        reward = - (latency_penalty + energy_penalty + carbon_penalty)
        
        # Q-Learning Update Rule 
        old_q = self.q_table[state_key].get(action_key, 0.0)
        new_q = old_q + self.alpha * (reward + self.gamma * 0 - old_q)
        
        self.q_table[state_key][action_key] = new_q
        self.save_q_table() 
        
        # Force single strategy map if no multi-gpu bound exists natively
        par_strat = workload.parallelism_options[0] if workload.parallelism_options else "Data Parallel"
        if not capability.multi_gpu:
            par_strat = "Data Parallel"
        
        return SchedulingDecision(
            allocated_gpus=action_gpus,
            allocated_cpu_cores=allocated_cpu_cores,
            parallel_strategy=par_strat,
            suggested_precision="FP16" if capability.gpu_available else "FP32",
            reward_score=new_q
        )

rl_scheduler = RLSchedulerEngine()
