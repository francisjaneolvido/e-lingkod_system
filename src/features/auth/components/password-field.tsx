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
    <div className="elb-auth-field">
      <label htmlFor={id} className="text-foreground">{label}</label>
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
          className="elb-auth-input pl-11 pr-12"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow(v => !v)}
          className="elb-password-toggle"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
