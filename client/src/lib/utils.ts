import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPoints(points: number | string | undefined | null) {
  const val = typeof points === 'string' ? parseFloat(points) : (points || 0);
  if (isNaN(val)) return "0";
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
