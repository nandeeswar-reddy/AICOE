import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { JobSubmissionPanel } from './components/JobSubmissionPanel';
import { HardwareResourcePanel } from './components/HardwareResourcePanel';
import { AIJobMetricsPanel } from './components/AIJobMetricsPanel';
import { DynamicOptimizationPanel } from './components/DynamicOptimizationPanel';
import { LogsPanel } from './components/LogsPanel';
import { fetchCapabilityProfile, fetchTelemetry, runFullOptimization } from './api/client';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [capability, setCapability] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilityProfile().then(setCapability).catch(console.error);
    fetchTelemetry().then(setTelemetry).catch(console.error);

    const interval = setInterval(() => {
      fetchTelemetry().then(setTelemetry).catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleRunOptimization = async (workloadData: any, hardwareData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await runFullOptimization(workloadData, hardwareData);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to run optimization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background relative">
          {error && (
            <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500 text-red-100 px-4 py-2 rounded-lg shadow-lg z-50">
              {error}
              <button onClick={() => setError(null)} className="ml-4 font-bold text-red-500 hover:text-red-300">X</button>
            </div>
          )}

          {/* Main Content Rendering Logic */}
          <div className={activeTab === 'dashboard' ? "flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-0 h-full" : "flex-1 flex flex-col gap-6 min-h-0 h-full max-w-4xl mx-auto w-full"}>

            {/* Job Submission Wrapper */}
            <div className={`glass-panel flex-col shadow-xl overflow-hidden ${activeTab === 'dashboard' ? 'flex p-4' : activeTab === 'submission' ? 'flex flex-1 p-6' : 'hidden'}`}>
              <h2 className={`font-bold flex items-center gap-2 shrink-0 ${activeTab === 'dashboard' ? 'text-xl mb-4' : 'text-2xl mb-6'}`}>
                <span className={`bg-primary rounded-full inline-block ${activeTab === 'dashboard' ? 'w-1.5 h-6' : 'w-2 h-8'}`}></span>
                Job Submission {activeTab === 'dashboard' ? '& Scheduling' : 'Console'}
              </h2>
              <div className="flex-1 overflow-hidden">
                <JobSubmissionPanel onRunOptimization={handleRunOptimization} isLoading={isLoading} results={results} />
              </div>
            </div>

            {/* Hardware Resource Dashboard Wrapper */}
            <div className={`glass-panel flex-col shadow-xl overflow-hidden ${activeTab === 'dashboard' ? 'flex p-4' : activeTab === 'metrics' ? 'flex flex-1 min-h-[400px] p-6' : 'hidden'}`}>
              <h2 className={`font-bold flex items-center gap-2 shrink-0 ${activeTab === 'dashboard' ? 'text-xl mb-4' : 'text-2xl mb-6'}`}>
                <span className={`bg-secondary rounded-full inline-block ${activeTab === 'dashboard' ? 'w-1.5 h-6' : 'w-2 h-8'}`}></span>
                Hardware Resource Dashboard
              </h2>
              <div className="flex-1 overflow-hidden">
                <HardwareResourcePanel telemetry={telemetry} capability={capability} results={results} />
              </div>
            </div>

            {/* AI Job Metrics & Forecasting Wrapper */}
            <div className={`glass-panel flex-col shadow-xl overflow-hidden ${activeTab === 'dashboard' ? 'flex p-4' : activeTab === 'metrics' ? 'flex flex-1 min-h-[400px] p-6' : 'hidden'}`}>
              <h2 className={`font-bold flex items-center gap-2 shrink-0 ${activeTab === 'dashboard' ? 'text-xl mb-4' : 'text-2xl mb-6'}`}>
                <span className={`bg-accent rounded-full inline-block ${activeTab === 'dashboard' ? 'w-1.5 h-6' : 'w-2 h-8'}`}></span>
                {activeTab === 'dashboard' ? 'AI Job Metrics & Forecasting' : 'Extensive AI Metrics & Telemetry'}
              </h2>
              <div className="flex-1 overflow-hidden">
                <AIJobMetricsPanel results={results} telemetry={telemetry} />
              </div>
            </div>

            {/* Dynamic Optimization & Monitoring Wrapper */}
            <div className={`glass-panel flex-col shadow-xl overflow-hidden ${activeTab === 'dashboard' ? 'flex p-4' : activeTab === 'scheduler' ? 'flex flex-1 p-6' : 'hidden'}`}>
              <h2 className={`font-bold flex items-center gap-2 shrink-0 ${activeTab === 'dashboard' ? 'text-xl mb-4' : 'text-2xl mb-6'}`}>
                <span className={`bg-orange-500 rounded-full inline-block ${activeTab === 'dashboard' ? 'w-1.5 h-6' : 'w-2 h-8'}`}></span>
                {activeTab === 'dashboard' ? 'Dynamic Optimization & Monitoring' : 'Scheduler Operations (Dynamic)'}
              </h2>
              <div className="flex-1 overflow-hidden">
                <DynamicOptimizationPanel results={results} />
              </div>
            </div>

            {/* System Logs Panel Wrapper */}
            <div className={`glass-panel flex-col shadow-xl overflow-hidden ${activeTab === 'logs' ? 'flex flex-1 p-6' : 'hidden'}`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 shrink-0">
                <span className="w-2 h-8 bg-purple-500 rounded-full inline-block"></span>
                System Logs Activity Stream
              </h2>
              <div className="flex-1 overflow-hidden flex flex-col gap-6">
                <LogsPanel telemetry={telemetry} results={results} />
              </div>
            </div>

            {/* Admin Placeholder Wrapper */}
            <div className={`${activeTab === 'admin' ? 'h-full flex flex-col items-center justify-center text-subtext flex-1' : 'hidden'}`}>
              <div className="text-6xl mb-4 opacity-50">🚧</div>
              <div className="text-2xl font-semibold mb-2">Admin Area</div>
              <div className="text-sm opacity-70">This module is currently routing exclusively through the CLI backend. UI integration pending.</div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
