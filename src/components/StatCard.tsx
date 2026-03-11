// src/components/StatCard.tsx
import { type LucideIcon, TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  borderColor?: string;
  subtitle?: string;
  className?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  actionLabel?: string;
}

const changeStyles = {
  up: {
    text: "text-emerald-600",
    icon: TrendingUp,
  },
  down: {
    text: "text-destructive",
    icon: TrendingDown,
  },
  neutral: {
    text: "text-muted-foreground",
    icon: Minus,
  },
};

const baseCardClass =
  "group rounded-2xl border border-border border-t-4 bg-card p-5 shadow-sm transition-all duration-200";

const interactiveClass =
  "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer";

const disabledClass =
  "opacity-60 cursor-not-allowed hover:translate-y-0 hover:shadow-sm";

type CardInnerProps = {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  subtitle?: string;
  actionLabel?: string;
};

const CardInner = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  subtitle,
  actionLabel,
}: CardInnerProps) => {
  const changeConfig = changeStyles[changeType];
  const ChangeIcon = changeConfig.icon;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>

        <p className="mt-2 text-2xl font-bold text-card-foreground md:text-3xl">
          {value}
        </p>

        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}

        {change && (
          <div
            className={cn(
              "mt-3 flex items-center gap-1.5 text-sm font-medium",
              changeConfig.text
            )}
          >
            <ChangeIcon className="h-4 w-4" />
            <span>{change}</span>
          </div>
        )}

        {actionLabel && (
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            <span>{actionLabel}</span>
            <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        )}
      </div>

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  borderColor = "border-primary",
  subtitle,
  className,
  to,
  onClick,
  disabled = false,
  actionLabel,
}: StatCardProps) => {
  const cardClasses = cn(
    baseCardClass,
    borderColor,
    disabled ? disabledClass : (to || onClick) ? interactiveClass : "",
    className
  );

  if (!disabled && to) {
    return (
      <Link to={to} className={cardClasses} aria-label={actionLabel || title}>
        <CardInner
          title={title}
          value={value}
          change={change}
          changeType={changeType}
          icon={icon}
          subtitle={subtitle}
          actionLabel={actionLabel}
        />
      </Link>
    );
  }

  if (!disabled && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(cardClasses, "w-full text-left")}
        aria-label={actionLabel || title}
      >
        <CardInner
          title={title}
          value={value}
          change={change}
          changeType={changeType}
          icon={icon}
          subtitle={subtitle}
          actionLabel={actionLabel}
        />
      </button>
    );
  }

  return (
    <div className={cardClasses} aria-disabled={disabled}>
      <CardInner
        title={title}
        value={value}
        change={change}
        changeType={changeType}
        icon={icon}
        subtitle={subtitle}
        actionLabel={!disabled ? actionLabel : undefined}
      />
    </div>
  );
};

export default StatCard;