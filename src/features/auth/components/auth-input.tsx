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
      <label htmlFor={id} className="block text-xs font-semibold text-[#245376]">{label}</label>
      <div className="relative">
        {Icon && <Icon aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8da8b9]" />}
        <input
          id={id}
          {...props}
          className={`h-[49px] w-full rounded-[12px] border border-[#d8e4ed] bg-white/90 ${Icon ? "pl-11" : "pl-4"} pr-4 text-[13px] text-[#143b5e] outline-none transition placeholder:text-[#a0b2bf] hover:border-[#9bc7df] focus:border-[#2287b4] focus:ring-[3px] focus:ring-[#d5edf9] ${className}`}
        />
      </div>
      {hint && <p className="text-[11px] leading-5 text-[#8197a7]">{hint}</p>}
    </div>
  );
}
