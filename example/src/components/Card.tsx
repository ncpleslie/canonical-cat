import type { ReactNode } from "react";

/**
 * Card variants for different visual styles
 */
export type CardVariant = "primary" | "secondary" | "info" | "warning";

/**
 * Props for the Card component
 */
export interface CardProps {
  /** Card title displayed in header */
  title?: string;
  /** Card content */
  children: ReactNode;
  /** Visual style variant */
  variant?: CardVariant;
  /** Optional footer content */
  footer?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Card component for grouping related content with optional title and footer
 * Commonly used for dashboard widgets, content sections, and feature highlights
 */
export const Card = ({
  title,
  children,
  variant = "primary",
  footer,
  className = "",
}: CardProps) => {
  const variantColors = {
    primary: "#007bff",
    secondary: "#6c757d",
    info: "#17a2b8",
    warning: "#ffc107",
  };

  const cardStyle = {
    border: `2px solid ${variantColors[variant]}`,
    borderRadius: "8px",
    padding: "1.5rem",
    marginBottom: "1rem",
    backgroundColor: "white",
  };

  const headerStyle = {
    marginTop: 0,
    marginBottom: "1rem",
    color: variantColors[variant],
    fontSize: "1.5rem",
    fontWeight: 600,
  };

  const footerStyle = {
    marginTop: "1rem",
    paddingTop: "1rem",
    borderTop: "1px solid #dee2e6",
  };

  return (
    <div style={cardStyle} className={className}>
      {title && <h3 style={headerStyle}>{title}</h3>}
      <div>{children}</div>
      {footer && <div style={footerStyle}>{footer}</div>}
    </div>
  );
};
