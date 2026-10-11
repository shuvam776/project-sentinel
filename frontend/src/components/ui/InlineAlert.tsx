import React from "react";
import { clsx } from "clsx";
import { Info, AlertTriangle, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export type AlertTone = "info" | "processing" | "warning" | "danger" | "success";

export interface InlineAlertProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  tone = "info",
  title,
  children,
  action,
  className,
}) => {
  const toneClasses = {
    info: "bg-processing-subtle border-processing-border text-txt-primary",
    processing: "bg-processing-subtle border-processing-border text-txt-primary",
    warning: "bg-warning-subtle border-warning-border text-txt-primary",
    danger: "bg-danger-subtle border-danger-border text-txt-primary",
    success: "bg-success-subtle border-success-border text-txt-primary",
  };

  const iconComponent = {
    info: <Info className="w-4 h-4 text-processing flex-shrink-0" />,
    processing: <Loader2 className="w-4 h-4 text-processing animate-spin flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
    danger: <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />,
  };

  const role = tone === "danger" ? "alert" : "status";

  return (
    <div
      role={role}
      className={clsx(
        "flex items-start justify-between gap-3 p-2.5 rounded-sm border text-xs leading-relaxed",
        toneClasses[tone],
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="mt-0.5">{iconComponent[tone]}</div>
        <div className="min-w-0 flex-1">
          {title && <div className="font-medium text-txt-primary mb-0.5">{title}</div>}
          <div className="text-txt-secondary">{children}</div>
        </div>
      </div>
      {action && <div className="flex-shrink-0 self-center">{action}</div>}
    </div>
  );
};

export default InlineAlert;
