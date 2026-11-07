import type { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  hint?: string;
  icon?: LucideIcon;
};

export function AuthInput({ label, id, hint, icon: Icon, className = "", ...props }: AuthInputProps) {
  return (
    <div className="elb-auth-field">
      <label htmlFor={id} className="text-foreground">{label}</label>
      <div className="relative">
        {Icon && <Icon aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        <input
          id={id}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...props}
          className={`elb-auth-input ${Icon ? "pl-11" : "pl-4"} pr-4 ${className}`}
        />
      </div>
      {hint && <p id={`${id}-hint`} className="elb-auth-hint">{hint}</p>}
    </div>
  );
}
