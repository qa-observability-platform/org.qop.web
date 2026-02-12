// src/components/JobNumberBadge.tsx
'use client';

interface JobNumberBadgeProps {
  jobPrefix: string | null | undefined;
  jobNumber: number | null | undefined;
  runnerType: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function JobNumberBadge({
  jobPrefix,
  jobNumber,
  runnerType,
  size = 'md',
  showIcon = true,
}: JobNumberBadgeProps) {
  if (!jobPrefix || !jobNumber) {
    return null;
  }

  const jobId = `${jobPrefix}-#${jobNumber}`;

  // Runner type specific styling
  const runnerIcons: Record<string, string> = {
    playwright: '🎭',
    selenium: '🌐',
    api: '⚡',
    cypress: '🌲',
  };

  const runnerColors: Record<string, string> = {
    playwright: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    selenium: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    api: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    cypress: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const color = runnerType ? runnerColors[runnerType] || 'bg-slate-500/10 text-slate-300 border-slate-500/30' : 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  const icon = runnerType && showIcon ? runnerIcons[runnerType] : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-mono font-medium ${color} ${sizeClasses[size]}`}
      title={`${runnerType ? runnerType.charAt(0).toUpperCase() + runnerType.slice(1) : 'Test'} Run #${jobNumber}`}
    >
      {icon && <span>{icon}</span>}
      {jobId}
    </span>
  );
}

interface RunnerTypeBadgeProps {
  runnerType: string | null | undefined;
  size?: 'sm' | 'md';
}

export function RunnerTypeBadge({ runnerType, size = 'sm' }: RunnerTypeBadgeProps) {
  if (!runnerType) {
    return null;
  }

  const runnerIcons: Record<string, string> = {
    playwright: '🎭',
    selenium: '🌐',
    api: '⚡',
    cypress: '🌲',
  };

  const runnerColors: Record<string, string> = {
    playwright: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    selenium: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    api: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    cypress: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  const color = runnerColors[runnerType] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  const icon = runnerIcons[runnerType];
  const label = runnerType.charAt(0).toUpperCase() + runnerType.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${color} ${sizeClasses[size]}`}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
