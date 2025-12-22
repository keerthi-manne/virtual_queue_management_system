import { Priority } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Heart, User, Zap } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
}

const priorityConfig: Record<Priority, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof User; className: string }> = {
  EMERGENCY: {
    label: 'Emergency',
    variant: 'destructive',
    icon: Zap,
    className: 'bg-destructive text-destructive-foreground',
  },
  DISABLED: {
    label: 'Disabled',
    variant: 'default',
    icon: Heart,
    className: 'bg-blue-600 text-white dark:bg-blue-500',
  },
  SENIOR: {
    label: 'Senior',
    variant: 'secondary',
    icon: User,
    className: 'bg-amber-500 text-white dark:bg-amber-600',
  },
  NORMAL: {
    label: 'Normal',
    variant: 'outline',
    icon: User,
    className: 'bg-secondary text-secondary-foreground',
  },
};

const PriorityBadge = ({ priority, showIcon = true }: PriorityBadgeProps) => {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge className={`gap-1 ${config.className}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

export default PriorityBadge;
