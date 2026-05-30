import { useEffect, useRef } from "react";

// Modal-dialog a11y in one hook. Attach the returned ref to the dialog element
// (give it role="dialog" aria-modal="true", an aria-label, and tabIndex={-1}),
// and render it only while `open`. While open it: moves focus into the dialog,
// traps Tab within it, closes on Escape, and restores focus to the previously
// focused element on close. A small stack ensures Escape/Tab only act on the
// top-most dialog, so nested sheets (e.g. the finish sheet's photo picker) work.
const dialogStack: object[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialog<T extends HTMLElement>(
  open: boolean,
  onClose: () => void
) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const token = {};
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogStack.push(token);

    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );

    (focusables()[0] ?? node).focus();

    const isTop = () => dialogStack[dialogStack.length - 1] === token;

    function onKey(e: KeyboardEvent) {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const i = dialogStack.indexOf(token);
      if (i !== -1) dialogStack.splice(i, 1);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
