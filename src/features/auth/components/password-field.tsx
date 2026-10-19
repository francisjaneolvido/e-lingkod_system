"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

type PasswordFieldProps = {
  id: string;
  name?: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
};

export function PasswordField({ id, name, label, placeholder = "Enter your password", autoComplete = "current-password", minLength = 8 }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold text-[#245376]">{label}</label>
      <div className="relative">
        <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8da8b9]" />
        <input
          id={id}
          name={name || id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          minLength={minLength}
          className="h-[49px] w-full rounded-[12px] border border-[#d8e4ed] bg-white/90 pl-11 pr-12 text-[13px] text-[#143b5e] outline-none transition placeholder:text-[#a0b2bf] hover:border-[#9bc7df] focus:border-[#2287b4] focus:ring-[3px] focus:ring-[#d5edf9]"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow(v => !v)}
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#819caf] transition hover:bg-[#eef7fc] hover:text-[#165879] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#237cb3]"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
