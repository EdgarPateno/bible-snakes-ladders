import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-page confirmation (window.confirm is blocked inside Artifacts). */
export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width="max-w-md">
      <div className="p-6">
        <h2 className="label-caps text-2xl text-oxblood">{title}</h2>
        <p className="mt-3 text-lg text-ink-soft">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel} data-autofocus>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
