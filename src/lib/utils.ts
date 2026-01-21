import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, "")

  if (numbers.length === 0) return ""

  // (XX) ...
  if (numbers.length <= 2) return `(${numbers}`

  // (XX) XXXX...
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`

  // (XX) XXXXX-XXXX (Mobile) - Switch to 5+4 format if > 10 digits (or default behavior)
  // Actually, let's keep it simple: 
  // If <= 10 digits: (XX) XXXX-XXXX
  // If 11 digits: (XX) XXXXX-XXXX

  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

export function formatCpf(value: string) {
  const numbers = value.replace(/\D/g, "")

  if (numbers.length === 0) return ""

  // 000.
  if (numbers.length <= 3) return numbers

  // 000.000
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`

  // 000.000.000
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`

  // 000.000.000-00
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
}
