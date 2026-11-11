import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const Icon = tone === "danger" ? AlertTriangle : Info;

  return (
    <Modal
      className="confirm-modal"
      eyebrow={tone === "danger" ? "PLEASE CONFIRM" : "CONFIRM"}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <span className="modal-foot-spacer" />
          <button className="secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={tone === "danger" ? "danger-button" : "primary-button"}
            type="button"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className={`confirm-body confirm-body--${tone}`}>
        <span className="confirm-icon">
          <Icon size={20} />
        </span>
        <p>{message}</p>
      </div>
    </Modal>
  );
}
