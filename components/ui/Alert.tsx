import React from "react";
import { IconAlert, IconCheck, IconInfo } from "@/components/v32/icons";

type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertProps {
  variant?:  AlertVariant;
  title?:    string;
  children:  React.ReactNode;
  className?: string;
}

// A quiet inline notice: surface panel, a toned icon and title, body in the
// secondary ink. Tone comes from the status tokens, never a glow or a bar.
const CFG: Record<AlertVariant, { tk: string; color: string; Icon: typeof IconInfo }> = {
  info:    { tk: "--tk-info",     color: "var(--info)",     Icon: IconInfo },
  success: { tk: "--tk-positive", color: "var(--positive)", Icon: IconCheck },
  warning: { tk: "--tk-warning",  color: "var(--warning)",  Icon: IconAlert },
  danger:  { tk: "--tk-critical", color: "var(--critical)", Icon: IconAlert },
};

export function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  const c = CFG[variant];
  return (
    <div
      role={variant === "danger" || variant === "warning" ? "alert" : "status"}
      className={["flex", className].join(" ")}
      style={{
        gap: 12, padding: "12px 16px", borderRadius: "var(--radius-md)",
        background: `rgb(var(${c.tk}) / 0.07)`, border: `1px solid rgb(var(${c.tk}) / 0.22)`,
      }}
    >
      <span className="shrink-0" style={{ color: c.color, marginTop: 1 }}><c.Icon size={15} /></span>
      <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
        {title && <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{title}</p>}
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  );
}
