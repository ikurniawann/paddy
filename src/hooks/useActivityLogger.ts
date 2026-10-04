import { useActivityLog } from "@/contexts/ActivityLogContext";
import { createActivityLogger } from "@/lib/activity-logger";

/**
 * Enhanced Activity Logger Hook
 * 
 * Usage:
 * const logger = useActivityLogger();
 * 
 * // Create PO
 * logger.createPO('PO Created', 'PO-001');
 * 
 * // Update status
 * logger.statusChangeGRN('GRN Received', 'Pending', 'Received', 'GRN-005');
 */

export function useActivityLogger() {
  const { addLog } = useActivityLog();
  const logger = createActivityLogger(addLog);

  return {
    // Generic methods
    ...logger,

    // Convenience methods for common modules
    createPO: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('PO', title, undefined, recordNumber, metadata),

    updatePO: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('PO', title, undefined, recordNumber, changes, metadata),

    statusChangePO: (title: string, fromStatus: string, toStatus: string, recordNumber?: string, metadata?: any) =>
      logger.logStatusChange('PO', title, fromStatus, toStatus, undefined, recordNumber, metadata),

    createGRN: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('GRN', title, undefined, recordNumber, metadata),

    updateGRN: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('GRN', title, undefined, recordNumber, changes, metadata),

    statusChangeGRN: (title: string, fromStatus: string, toStatus: string, recordNumber?: string, metadata?: any) =>
      logger.logStatusChange('GRN', title, fromStatus, toStatus, undefined, recordNumber, metadata),

    createSupplier: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('SUPPLIER', title, undefined, recordNumber, metadata),

    updateSupplier: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('SUPPLIER', title, undefined, recordNumber, changes, metadata),

    createRawMaterial: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('RAW_MATERIAL', title, undefined, recordNumber, metadata),

    updateRawMaterial: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('RAW_MATERIAL', title, undefined, recordNumber, changes, metadata),

    createProduct: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('PRODUCT', title, undefined, recordNumber, metadata),

    updateProduct: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('PRODUCT', title, undefined, recordNumber, changes, metadata),

    createPriceList: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('PRICE_LIST', title, undefined, recordNumber, metadata),

    updatePriceList: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('PRICE_LIST', title, undefined, recordNumber, changes, metadata),

    createDelivery: (title: string, recordNumber?: string, metadata?: any) =>
      logger.logCreate('DELIVERY', title, undefined, recordNumber, metadata),

    updateDelivery: (title: string, recordNumber?: string, changes?: string, metadata?: any) =>
      logger.logUpdate('DELIVERY', title, undefined, recordNumber, changes, metadata),
  };
}
