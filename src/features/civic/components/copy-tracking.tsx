"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import s from "../civic.module.css";

export function CopyTracking({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setFailed(false); }
    catch { setFailed(true); }
  }
  return <><button type="button" className={s.iconButton} onClick={copy} aria-label={copied ? "Tracking ID copied" : "Copy tracking ID"} title={copied ? "Copied" : "Copy tracking ID"}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><span className={s.srOnly} role="status">{copied ? "Tracking ID copied." : failed ? `Copy unavailable. Your tracking ID is ${value}.` : ""}</span>{failed && <small className={s.hint}>Select the ID to copy it manually.</small>}</>;
}
