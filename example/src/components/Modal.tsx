import { useEffect, type ReactNode } from "react";

/**
 * Props for the Modal component
 */
export interface ModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Width of the modal */
  width?: string | number;
}

/**
 * Modal dialog component for displaying content in an overlay
 * Use this for confirmations, forms, or detailed information that needs focus
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  width = "500px",
}: ModalProps) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlayStyle = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    width: typeof width === "number" ? `${width}px` : width,
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflow: "auto",
    position: "relative" as const,
  };

  const closeButtonStyle = {
    position: "absolute" as const,
    top: "1rem",
    right: "1rem",
    background: "none",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
    color: "#6c757d",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button
          style={closeButtonStyle}
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>
        {title && (
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>{title}</h2>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};
