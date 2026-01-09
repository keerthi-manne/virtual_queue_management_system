import { TokenStatus } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, CheckCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TokenStatus;
}

const statusConfig: Record<TokenStatus, { label: string; icon: typeof Clock; className: string }> = {
  waiting: {
    label: 'Waiting',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  called: {
    label: 'Called',
    icon: Phone,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  serving: {
    label: 'Serving',
    icon: Phone,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  no_show: {
    label: 'No Show',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
