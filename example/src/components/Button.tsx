import type { ReactNode } from "react";

/**
 * Button variants for different visual styles
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "success";

/**
 * Props for the Button component
 */
export interface ButtonProps {
  /** Button content */
  children: ReactNode;
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Click handler */
  onClick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button type attribute */
  type?: "button" | "submit" | "reset";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable button component with multiple style variants
 * Use this for all clickable actions throughout the application
 */
export const Button = ({
  children,
  variant = "primary",
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: ButtonProps) => {
  const baseStyles = {
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "4px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "1rem",
    fontWeight: 500,
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.2s",
  };

  const variantStyles = {
    primary: { background: "#007bff", color: "white" },
    secondary: { background: "#6c757d", color: "white" },
    danger: { background: "#dc3545", color: "white" },
    success: { background: "#28a745", color: "white" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...baseStyles, ...variantStyles[variant] }}
    >
      {children}
    </button>
  );
};
