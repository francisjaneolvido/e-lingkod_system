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
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold text-foreground">{label}</label>
      <div className="relative">
        {Icon && <Icon aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        <input
          id={id}
          {...props}
          className={`h-[49px] w-full rounded-[12px] border border-border bg-card/90 ${Icon ? "pl-11" : "pl-4"} pr-4 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground hover:border-border focus:border-border focus:ring-[3px] focus:ring-border ${className}`}
        />
      </div>
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}
