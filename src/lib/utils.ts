import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyBRL(value: string | number | null | undefined): string {
  if (value === undefined || value === null || value === '') return 'R$ 0,00';
  
  let centsStr = '';
  if (typeof value === 'number') {
    centsStr = Math.round(value * 100).toString();
  } else {
    centsStr = value.replace(/\D/g, '');
  }

  if (!centsStr || centsStr === '0') return 'R$ 0,00';
  
  while (centsStr.length < 3) {
    centsStr = '0' + centsStr;
  }
  
  const cents = centsStr.slice(-2);
  const rest = centsStr.slice(0, -2);
  
  const formattedRest = Number(rest).toLocaleString('pt-BR');
  return `R$ ${formattedRest},${cents}`;
}

export function parseCurrencyBRL(formattedValue: string | number | null | undefined): number {
  if (formattedValue === undefined || formattedValue === null) return 0;
  if (typeof formattedValue === 'number') return formattedValue;
  const clean = formattedValue.replace(/\D/g, '');
  if (!clean) return 0;
  return Number(clean) / 100;
}
