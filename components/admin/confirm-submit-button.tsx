"use client";

/**
 * Drop-in replacement for a plain <button type="submit"> inside a form
 * bound to a destructive server action (delete, reject, deactivate).
 * Blocks the submit with a native confirm() so a stray click can't fire
 * an irreversible action. Native confirm is used deliberately — this
 * codebase has no dialog/modal component, and one per destructive action
 * would be more UI to maintain than a browser-native guard here.
 */
export function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
