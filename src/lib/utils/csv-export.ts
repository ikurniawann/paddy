/**
 * Convert array of objects to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: keyof T | string; label: string; format?: (value: any, row: T) => string }>
): string {
  // Header
  const header = columns.map((col) => `"${col.label}"`).join(",");
  
  // Rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value: any;
        
        if (typeof col.key === "string" && col.key.includes(".")) {
          // Handle nested keys like "raw_material.nama"
          value = col.key.split(".").reduce((obj, key) => obj?.[key], row as any);
        } else {
          value = row[col.key as keyof T];
        }
        
        // Apply custom formatter if provided
        if (col.format) {
          return `"${col.format(value, row)}"`;
        }
        
        // Handle different types
        if (value === null || value === undefined) {
          return '""';
        }
        
        if (typeof value === "number") {
          return value.toString();
        }
        
        if (value instanceof Date) {
          return `"${value.toISOString().split("T")[0]}"`;
        }
        
        // Escape quotes and wrap in quotes
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(",");
  });
  
  return [header, ...rows].join("\n");
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
}

/**
 * Format currency for CSV
 */
export function formatCurrencyForCSV(amount: number | null | undefined, currency: string = "IDR"): string {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
