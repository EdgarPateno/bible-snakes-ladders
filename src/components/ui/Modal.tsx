import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  /** Called on Esc or backdrop click. Leave out to make the modal stay until an action is taken. */
  onClose?: () => void;
  children: ReactNode;
  width?: string;
  /** Change this when the content swaps (e.g. question → result) to move focus to the new content. */
  focusKey?: string;
}

/** Accessible dialog: focus moves in on open, Tab stays inside, Esc closes, focus returns on close. */
export function Modal({ open, title, onClose, children, width = 'max-w-2xl', focusKey }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);

  // Remember what had focus, keep focus inside while open, and give it back on close.
  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement | null;
    const keepInside = (e: FocusEvent) => {
      const el = panel.current;
      if (!el || !(e.target instanceof Element) || el.contains(e.target)) return;
      // Another dialog stacked on top (e.g. a confirmation) owns its own focus.
      if (e.target.closest('[role="dialog"]')) return;
      el.focus();
    };
    document.addEventListener('focusin', keepInside);
    return () => {
      document.removeEventListener('focusin', keepInside);
      restore.current?.focus?.();
    };
  }, [open]);

  // Focus the preferred control on open and whenever the content swaps.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = panel.current;
      if (!el) return;
      const auto = el.querySelector<HTMLElement>('[data-autofocus]');
      (auto ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el).focus();
    }, 30);
    return () => clearTimeout(t);
  }, [open, focusKey]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      e.stopPropagation();
      onClose();
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,18,8,0.55)] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className={`panel w-full ${width} max-h-[92dvh] overflow-y-auto outline-none`}
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
