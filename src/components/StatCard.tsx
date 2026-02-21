// src/components/StatCard.tsx
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: LucideIcon;
  borderColor: string;
}

const StatCard = ({ title, value, change, changeType, icon: Icon, borderColor }: StatCardProps) => {
  const getChangeColor = () => {
    switch (changeType) {
      case "up":
        return "text-accent";
      case "down":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "•";
    }
  };

  return (
    <div className={`rounded-lg border-t-4 bg-card p-5 shadow-sm ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-card-foreground">{value}</p>
          <p className={`mt-2 text-sm ${getChangeColor()}`}>
            <span className="mr-1">{getChangeIcon()}</span>
            {change}
          </p>
        </div>
        <Icon className="h-10 w-10 text-muted-foreground/30" />
      </div>
    </div>
  );
};

export default StatCard;