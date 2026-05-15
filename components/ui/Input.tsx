"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, hint, prefix, icon, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-secondary text-sm font-mono select-none">{prefix}</span>
        )}
        {icon && !prefix && (
          <span className="absolute left-3 text-secondary">{icon}</span>
        )}
        <input
          id={inputId}
          className={[
            "w-full bg-surface-2 border rounded-md text-sm text-primary placeholder-muted",
            "transition-colors duration-150 focus:outline-none focus:border-accent",
            error ? "border-danger" : "border-border",
            prefix ? "pl-8" : icon ? "pl-9" : "pl-3",
            "pr-3 py-2.5",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-secondary">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, hint, options, className = "", id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-secondary uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={[
          "w-full bg-surface-2 border rounded-md text-sm text-primary",
          "transition-colors duration-150 focus:outline-none focus:border-accent",
          "px-3 py-2.5 appearance-none",
          error ? "border-danger" : "border-border",
          className,
        ].join(" ")}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-secondary">{hint}</p>}
    </div>
  );
}
