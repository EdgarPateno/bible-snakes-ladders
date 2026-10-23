import { AnimatePresence, motion } from 'framer-motion';
import { useToasts } from '../store/toastStore';

const TONE = {
  success: 'border-olive bg-[#eef3df] text-olive-dark',
  error: 'border-oxblood bg-[#f8e3dc] text-oxblood-dark',
  info: 'border-walnut/50 bg-parchment-50 text-ink',
};

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top,0px))] z-[60] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            layout
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className={`pointer-events-auto max-w-md rounded-xl border-2 px-5 py-2.5 text-left shadow-lg ${TONE[t.tone]}`}
          >
            <span className="block text-xl font-bold">{t.title}</span>
            {t.body && <span className="block text-base opacity-90">{t.body}</span>}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
