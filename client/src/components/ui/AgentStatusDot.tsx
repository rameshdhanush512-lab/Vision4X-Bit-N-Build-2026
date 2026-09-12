import { AgentStatus } from '../../types';
import { cn } from '../../utils';

interface Props { status: AgentStatus }

const MAP: Record<AgentStatus, { dot: string; label: string }> = {
  WAITING:   { dot: 'bg-gray-500',                  label: 'Waiting'   },
  RUNNING:   { dot: 'bg-blue-400 animate-pulse',    label: 'Running'   },
  COMPLETED: { dot: 'bg-green-400',                 label: 'Completed' },
  FAILED:    { dot: 'bg-red-400',                   label: 'Failed'    },
  SKIPPED:   { dot: 'bg-purple-400',                label: 'Skipped'   },
};

export function AgentStatusDot({ status }: Props) {
  const { dot, label } = MAP[status] ?? MAP.WAITING;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
      <span className="text-xs text-gray-400">{label}</span>
    </span>
  );
}
