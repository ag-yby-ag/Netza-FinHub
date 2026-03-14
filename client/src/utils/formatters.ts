/**
 * Brazilian locale formatters for Netza FinHub.
 */

/**
 * Formats a number as Brazilian Real currency (R$).
 * Example: 1234567.89 -> "R$ 1.234.567,89"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formats a Date or ISO string to dd/mm/yyyy.
 * Example: "2024-03-14" -> "14/03/2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a CNPJ string.
 * Example: "12345678000199" -> "12.345.678/0001-99"
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '').padStart(14, '0');
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formats a phone number.
 * Example: "11999998888" -> "(11) 99999-8888"
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return phone;
}
