"use client";

import { useState, type ChangeEventHandler } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

type PasswordFieldProps = {
  id: string;
  name?: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
};

export function PasswordField({ id, name, label, placeholder = "Enter your password", autoComplete = "current-password", minLength = 8, maxLength, value, onChange, disabled }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold text-foreground">{label}</label>
      <div className="relative">
        <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          name={name || id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          minLength={minLength}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="h-[49px] w-full rounded-[12px] border border-border bg-card/90 pl-11 pr-12 text-[13px] text-foreground outline-none transition placeholder:text-muted-foreground hover:border-border focus:border-border focus:ring-[3px] focus:ring-border"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow(v => !v)}
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
