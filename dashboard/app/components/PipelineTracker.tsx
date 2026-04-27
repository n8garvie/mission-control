"use client";

import { Icon, type IconName } from "../lib/iconRegistry";

interface PipelineStage {
  label: string;
  count: number;
  total: number;
  iconName: IconName;
  color: string;
}

interface PipelineTrackerProps {
  pipeline?: {
    buildsStarted: number;
    buildsWithCode: number;
    buildsCommitted: number;
    buildsDeployed: number;
  };
}

export default function PipelineTracker({ pipeline }: PipelineTrackerProps) {
  if (!pipeline) return null;

  const stages: PipelineStage[] = [
    {
      label: "Started",
      count: pipeline.buildsStarted,
      total: pipeline.buildsStarted,
      iconName: "buildStage.agents_spawning",
      color: "var(--text-tertiary)",
    },
    {
      label: "Has Code",
      count: pipeline.buildsWithCode,
      total: pipeline.buildsStarted,
      iconName: "buildStage.building_locally",
      color: "var(--info-500)",
    },
    {
      label: "Committed",
      count: pipeline.buildsCommitted,
      total: pipeline.buildsStarted,
      iconName: "buildStage.pushing_to_github",
      color: "var(--accent-500)",
    },
    {
      label: "Deployed",
      count: pipeline.buildsDeployed,
      total: pipeline.buildsStarted,
      iconName: "buildStage.deploying_to_vercel",
      color: "var(--success-500)",
    },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-sm">Build Pipeline</h3>
        <span className="text-xs text-[var(--text-tertiary)]">
          {Math.round((pipeline.buildsDeployed / pipeline.buildsStarted) * 100)}% completion rate
        </span>
      </div>

      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-[var(--bg-tertiary)] rounded-full" />
        
        {/* Active progress */}
        <div 
          className="absolute top-6 left-0 h-1 bg-gradient-to-r from-[var(--info-500)] via-[var(--accent-500)] to-[var(--success-500)] rounded-full transition-all duration-500"
          style={{ 
            width: `${(pipeline.buildsDeployed / pipeline.buildsStarted) * 100}%` 
          }}
        />

        {/* Stages */}
        <div className="relative grid grid-cols-4 gap-2">
          {stages.map((stage, index) => {
            const percentage = Math.round((stage.count / stage.total) * 100);
            const isActive = stage.count > 0;
            const isComplete = index === stages.length - 1 ? stage.count === stage.total : false;

            return (
              <div key={stage.label} className="text-center">
                {/* Icon */}
                <div 
                  className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-xl mb-2 transition-all duration-300 ${
                    isActive 
                      ? 'bg-white shadow-md' 
                      : 'bg-[var(--bg-tertiary)]'
                  }`}
                  style={{ 
                    border: isActive ? `2px solid ${stage.color}` : '2px solid transparent',
                    color: isActive ? stage.color : 'var(--text-tertiary)'
                  }}
                >
                  <Icon name={stage.iconName} size={18} aria-label={stage.label} />
                </div>

                {/* Label */}
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {stage.label}
                </div>

                {/* Count */}
                <div 
                  className="text-lg font-bold transition-colors duration-300"
                  style={{ color: isActive ? stage.color : 'var(--text-tertiary)' }}
                >
                  {stage.count}
                </div>

                {/* Percentage */}
                <div className="text-xs text-[var(--text-muted)]">
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel visualization */}
      <div className="mt-6 pt-4 border-t border-[var(--border-light)]">
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-2">
          <span>Drop-off Analysis</span>
          <span>Conversion Rate</span>
        </div>
        
        {[
          { from: "Started", to: "Has Code", current: pipeline.buildsWithCode, prev: pipeline.buildsStarted },
          { from: "Has Code", to: "Committed", current: pipeline.buildsCommitted, prev: pipeline.buildsWithCode || 1 },
          { from: "Committed", to: "Deployed", current: pipeline.buildsDeployed, prev: pipeline.buildsCommitted || 1 },
        ].map((step, i) => {
          const rate = Math.round((step.current / step.prev) * 100);
          const isGood = rate >= 80;
          const isWarning = rate >= 50 && rate < 80;
          
          return (
            <div key={i} className="flex items-center justify-between py-1.5">
              <span className="text-xs text-[var(--text-secondary)]">
                {step.from} → {step.to}
              </span>
              <div className="flex items-center gap-2">
                <div 
                  className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"
                  style={{ width: '60px' }}
                >
                  <div 
                    className={`h-full rounded-full ${
                      isGood ? 'bg-[var(--success-500)]' : 
                      isWarning ? 'bg-[var(--warning-500)]' : 
                      'bg-[var(--danger-500)]'
                    }`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${
                  isGood ? 'text-[var(--success-600)]' : 
                  isWarning ? 'text-[var(--warning-600)]' : 
                  'text-[var(--danger-600)]'
                }`}>
                  {rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
