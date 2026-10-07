"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { field } from "./ui";

/** 1234567 → "1,234,567" (dấu phẩy ngăn cách hàng nghìn). */
export const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const onlyDigits = (s: string) => s.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);

type Props = {
  /** Chuỗi chữ số thuần (không dấu phẩy). Bỏ trống thì ô tự giữ giá trị (dùng trong form GET với defaultValue). */
  value?: string;
  defaultValue?: string | number | null;
  onChange?: (digits: string) => void;
  /** Tên trường gửi đi trong form: gửi số thuần qua ô ẩn, ô hiển thị có dấu phẩy không có name. */
  name?: string;
  suffix?: string;
  className?: string;
  /** Lớp cho khung bọc (vd "min-w-0 flex-1" khi đặt trong hàng flex). */
  wrapClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "name" | "type" | "className">;

/** Ô nhập tiền: gõ 1000 hiện ngay 1,000; con trỏ giữ đúng vị trí khi dấu phẩy được chèn vào. */
export function MoneyInput({ value, defaultValue, onChange, name, suffix = "đ", className, wrapClassName, ...rest }: Props) {
  const [own, setOwn] = useState(() => onlyDigits(String(defaultValue ?? "")));
  const digits = value ?? own;
  const ref = useRef<HTMLInputElement>(null);
  // Số chữ số đứng trước con trỏ, để đặt lại con trỏ sau khi định dạng.
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current == null || document.activeElement !== el) return;
    let seen = 0, pos = 0;
    while (pos < el.value.length && seen < caret.current) { if (/\d/.test(el.value[pos])) seen++; pos++; }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  });

  return (
    <div className={`relative ${wrapClassName ?? ""}`}>
      <input ref={ref} inputMode="numeric" autoComplete="off" {...rest} value={groupThousands(digits)}
        onKeyDown={(e) => {
          // Xóa vào dấu phẩy thì xóa luôn chữ số bên cạnh (dấu phẩy tự sinh, không xóa riêng được).
          const el = e.currentTarget, at = el.selectionStart ?? 0;
          if (at !== el.selectionEnd) return;
          if (e.key === "Backspace" && el.value[at - 1] === ",") el.setSelectionRange(at - 1, at - 1);
          if (e.key === "Delete" && el.value[at] === ",") el.setSelectionRange(at + 1, at + 1);
          rest.onKeyDown?.(e);
        }}
        onChange={(e) => {
          const before = e.target.value.slice(0, e.target.selectionStart ?? e.target.value.length);
          caret.current = before.replace(/\D/g, "").replace(/^0+(?=\d)/, "").length;
          const next = onlyDigits(e.target.value);
          if (value === undefined) setOwn(next);
          onChange?.(next);
        }}
        className={className ?? `${field} ${suffix ? "pr-10" : ""} font-semibold tabular-nums`} />
      {name && <input type="hidden" name={name} value={digits} />}
      {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500">{suffix}</span>}
    </div>
  );
}
