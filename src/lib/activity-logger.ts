/**
 * Activity Logger Helper
 * 
 * Usage:
 * import { logActivity } from "@/lib/activity-logger";
 * 
 * logActivity('CREATE', 'PO', 'PO Created', 'PO-001 created successfully', 'PO-001');
 */

import { ActivityType, ActivityModule } from "@/types/activity-log";

// This will be called from components using useActivityLog
// We'll create a custom hook wrapper

export function createActivityLogger(addLog: (log: any) => void) {
  return {
    logCreate: (module: ActivityModule, title: string, recordId?: string, recordNumber?: string, metadata?: any) => {
      addLog({
        type: 'CREATE',
        module,
        title,
        description: `${recordNumber || 'Record'} created successfully`,
        recordId,
        recordNumber,
        metadata,
      });
    },

    logUpdate: (module: ActivityModule, title: string, recordId?: string, recordNumber?: string, changes?: string, metadata?: any) => {
      addLog({
        type: 'UPDATE',
        module,
        title,
        description: changes || `${recordNumber || 'Record'} updated successfully`,
        recordId,
        recordNumber,
        metadata,
      });
    },

    logDelete: (module: ActivityModule, title: string, recordId?: string, recordNumber?: string, metadata?: any) => {
      addLog({
        type: 'DELETE',
        module,
        title,
        description: `${recordNumber || 'Record'} deleted`,
        recordId,
        recordNumber,
        metadata,
      });
    },

    logStatusChange: (module: ActivityModule, title: string, fromStatus: string, toStatus: string, recordId?: string, recordNumber?: string, metadata?: any) => {
      addLog({
        type: 'STATUS_CHANGE',
        module,
        title,
        description: `Status changed from ${fromStatus} to ${toStatus}`,
        recordId,
        recordNumber,
        metadata,
      });
    },

    logApprove: (module: ActivityModule, title: string, recordId?: string, recordNumber?: string, metadata?: any) => {
      addLog({
        type: 'APPROVE',
        module,
        title,
        description: `${recordNumber || 'Record'} approved`,
        recordId,
        recordNumber,
        metadata,
      });
    },

    logReject: (module: ActivityModule, title: string, reason: string, recordId?: string, recordNumber?: string, metadata?: any) => {
      addLog({
        type: 'REJECT',
        module,
        title,
        description: `Rejected: ${reason}`,
        recordId,
        recordNumber,
        metadata,
      });
    },
  };
}
