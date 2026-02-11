# Component & Utility Catalog

> Auto-generated on 2026-02-11T03:31:08.460Z

## Table of Contents

- [Components](#components)
- [Hooks](#hooks)
- [Types](#types)
- [Utilities](#utilities)

## Components

### default

**File:** `src/App.tsx`

Main application component that demonstrates various UI components and hooks

**Signature:**
```typescript
function App()
```

---

### Button

**File:** `src/components/Button.tsx`

Reusable button component with multiple style variants
Use this for all clickable actions throughout the application

**Signature:**
```typescript
Button = ({
  children,
  variant = "primary",
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: ButtonProps) => ...
```

---

### Card

**File:** `src/components/Card.tsx`

Card component for grouping related content with optional title and footer
Commonly used for dashboard widgets, content sections, and feature highlights

**Signature:**
```typescript
Card = ({
  title,
  children,
  variant = "primary",
  footer,
  className = "",
}: CardProps) => ...
```

---

### Modal

**File:** `src/components/Modal.tsx`

Modal dialog component for displaying content in an overlay
Use this for confirmations, forms, or detailed information that needs focus

**Signature:**
```typescript
Modal = ({
  isOpen,
  onClose,
  title,
  children,
  width = "500px",
}: ModalProps) => ...
```

---

## Hooks

### useCounter

**File:** `src/hooks/useCounter.ts`

Hook for managing a numeric counter with increment, decrement, and reset functionality
Use this for any counting logic like pagination, quantity selectors, or score tracking

**Signature:**
```typescript
useCounter = (initialValue: number = 0): UseCounterReturn => ...
```

**Used in 1 places:**

- `src/App.tsx:13`

---

### useLocalStorage

**File:** `src/hooks/useLocalStorage.ts`

Hook for managing state that persists in localStorage
Use this to save user preferences, form data, or any state that should survive page refreshes

**Signature:**
```typescript
useLocalStorage = (key: string, initialValue: T): [T, (value: T) => void] => ...
```

---

### useToggle

**File:** `src/hooks/useToggle.ts`

Hook for managing boolean toggle state
Use this for any on/off, show/hide, or open/close scenarios

**Signature:**
```typescript
useToggle = (initialValue: boolean = false): [boolean, () => void] => ...
```

**Used in 1 places:**

- `src/App.tsx:12`

---

## Types

### ButtonVariant

**File:** `src/components/Button.tsx`

Button variants for different visual styles

**Signature:**
```typescript
export type ButtonVariant = "primary" | "secondary" | "danger" | "success";
```

---

### ButtonProps

**File:** `src/components/Button.tsx`

Props for the Button component

**Signature:**
```typescript
export interface ButtonProps {
```

---

### CardVariant

**File:** `src/components/Card.tsx`

Card variants for different visual styles

**Signature:**
```typescript
export type CardVariant = "primary" | "secondary" | "info" | "warning";
```

---

### CardProps

**File:** `src/components/Card.tsx`

Props for the Card component

**Signature:**
```typescript
export interface CardProps {
```

---

### ModalProps

**File:** `src/components/Modal.tsx`

Props for the Modal component

**Signature:**
```typescript
export interface ModalProps {
```

---

### UseCounterReturn

**File:** `src/hooks/useCounter.ts`

Return type for the useCounter hook

**Signature:**
```typescript
export interface UseCounterReturn {
```

---

## Utilities

### shuffle

**File:** `src/utils/array-utils.ts`

Shuffles an array randomly using Fisher-Yates algorithm

**Signature:**
```typescript
shuffle = (array: T[]): T[] => ...
```

---

### unique

**File:** `src/utils/array-utils.ts`

Removes duplicate values from an array

**Signature:**
```typescript
unique = (array: T[]): T[] => ...
```

---

### chunk

**File:** `src/utils/array-utils.ts`

Chunks an array into smaller arrays of specified size

**Signature:**
```typescript
chunk = (array: T[], size: number): T[][] => ...
```

---

### groupBy

**File:** `src/utils/array-utils.ts`

Groups array items by a key function

**Signature:**
```typescript
groupBy = (array: T[], keyFn: (item: T) => K): Record<K, T[]> => ...
```

---

### debounce

**File:** `src/utils/debounce.ts`

Creates a debounced function that delays invoking func until after wait milliseconds
have elapsed since the last time the debounced function was invoked

Useful for limiting the rate at which a function is executed, especially for
expensive operations like API calls or DOM manipulations triggered by user input

**Signature:**
```typescript
debounce = (func: T, wait: number): ((...args: Parameters<T>) => void) => ...
```

---

### capitalize

**File:** `src/utils/string-utils.ts`

Capitalizes the first letter of a string

**Signature:**
```typescript
capitalize = (str: string): string => ...
```

**Used in 1 places:**

- `src/App.tsx:20`

---

### toTitleCase

**File:** `src/utils/string-utils.ts`

Converts a string to title case (capitalizes first letter of each word)

**Signature:**
```typescript
toTitleCase = (str: string): string => ...
```

---

### truncate

**File:** `src/utils/string-utils.ts`

Truncates a string to a maximum length and adds ellipsis

**Signature:**
```typescript
truncate = (str: string, maxLength: number): string => ...
```

---

### formatDate

**File:** `src/utils/string-utils.ts`

Formats a date to a readable string

**Signature:**
```typescript
formatDate = (date: Date): string => ...
```

**Used in 1 places:**

- `src/App.tsx:19`

---
