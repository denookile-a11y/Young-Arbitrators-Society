import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-bold text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-soft/70">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextField({
  label,
  name,
  error,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <input
        id={name}
        name={name}
        className="w-full rounded-[2px] border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-navy-deep"
        {...rest}
      />
    </FieldWrapper>
  );
}

export function TextAreaField({
  label,
  name,
  error,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <textarea
        id={name}
        name={name}
        rows={5}
        className="w-full rounded-[2px] border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-navy-deep"
        {...rest}
      />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  options,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  options: { label: string; value: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrapper label={label} htmlFor={name} error={error} hint={hint}>
      <select
        id={name}
        name={name}
        className="w-full rounded-[2px] border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-navy-deep"
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export function CheckboxField({
  label,
  name,
  ...rest
}: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-6 flex items-center gap-2.5 text-sm font-semibold text-ink">
      <input
        type="checkbox"
        id={name}
        name={name}
        className="h-4 w-4 rounded-sm border-hairline accent-navy-deep"
        {...rest}
      />
      {label}
    </label>
  );
}

export function FormActions({
  isPending,
  submitLabel = "Save",
  cancelHref,
}: {
  isPending: boolean;
  submitLabel?: string;
  cancelHref: string;
}) {
  return (
    <div className="mt-8 flex items-center gap-3 border-t border-hairline pt-6">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[2px] bg-navy-deep px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-mid disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
      <a
        href={cancelHref}
        className="rounded-[2px] border border-hairline px-6 py-3 text-sm font-semibold text-ink-soft hover:border-navy-deep hover:text-navy-deep"
      >
        Cancel
      </a>
    </div>
  );
}
