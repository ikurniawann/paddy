import type { DbClient } from "@/lib/pg/types";

interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type: "approval" | "status_change" | "reminder" | "alert";
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Create in-app notification
 */
export async function createNotification(
  db: DbClient,
  payload: NotificationPayload
): Promise<void> {
  const { error } = await db.from("notifications").insert({
    user_id: payload.user_id,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    link: payload.link,
    metadata: payload.metadata,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating notification:", error);
  }
}

/**
 * Notify user that their PR needs approval
 */
export async function notifyApprovalRequired(
  db: DbClient,
  prId: string,
  prNumber: string,
  approverId: string,
  level: string
): Promise<void> {
  const levelLabel = {
    head: "Head Dept",
    finance: "Finance",
    direksi: "Direksi",
  }[level] || level;

  await createNotification(db, {
    user_id: approverId,
    title: `PR Menunggu Approval - ${levelLabel}`,
    message: `Purchase Request ${prNumber} membutuhkan persetujuan Anda sebagai ${levelLabel}`,
    type: "approval",
    link: `/dashboard/purchasing/pr/${prId}`,
    metadata: { pr_id: prId, pr_number: prNumber, level },
  });
}

/**
 * Notify requester of PR status change
 */
export async function notifyPRStatusChange(
  db: DbClient,
  prId: string,
  prNumber: string,
  requesterId: string,
  newStatus: string,
  approverName?: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    approved: "disetujui",
    rejected: "ditolak",
    converted: "dikonversi ke PO",
  };

  const action = statusLabels[newStatus] || newStatus;
  const byText = approverName ? ` oleh ${approverName}` : "";

  await createNotification(db, {
    user_id: requesterId,
    title: `PR ${action}`,
    message: `Purchase Request ${prNumber} telah ${action}${byText}`,
    type: "status_change",
    link: `/dashboard/purchasing/pr/${prId}`,
    metadata: { pr_id: prId, pr_number: prNumber, status: newStatus },
  });
}

/**
 * Notify PO status change
 */
export async function notifyPOStatusChange(
  db: DbClient,
  poId: string,
  poNumber: string,
  recipientId: string,
  newStatus: string,
  actorName?: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    sent: "dikirim ke vendor",
    received: "diterima seluruhnya",
    closed: "ditutup",
    cancelled: "dibatalkan",
  };

  const action = statusLabels[newStatus] || newStatus;
  const byText = actorName ? ` oleh ${actorName}` : "";

  await createNotification(db, {
    user_id: recipientId,
    title: `PO ${action}`,
    message: `Purchase Order ${poNumber} telah ${action}${byText}`,
    type: "status_change",
    link: `/dashboard/purchasing/po/${poId}`,
    metadata: { po_id: poId, po_number: poNumber, status: newStatus },
  });
}

/**
 * Notify about goods receipt
 */
export async function notifyGoodsReceived(
  db: DbClient,
  poId: string,
  poNumber: string,
  recipientId: string,
  grNumber: string,
  receivedBy: string
): Promise<void> {
  await createNotification(db, {
    user_id: recipientId,
    title: "Barang Diterima",
    message: `PO ${poNumber} telah diterima oleh ${receivedBy} (GR: ${grNumber})`,
    type: "status_change",
    link: `/dashboard/purchasing/po/${poId}`,
    metadata: { po_id: poId, po_number: poNumber, gr_number: grNumber },
  });
}

/**
 * Send reminder for pending approvals (for cron job)
 */
export async function sendApprovalReminders(
  db: DbClient
): Promise<void> {
  // Find PRs pending for more than 3 days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: pendingPRs } = await db
    .from("purchase_requests")
    .select("id, pr_number, created_at, current_approver_id")
    .in("status", ["pending_head", "pending_finance", "pending_direksi"])
    .lt("created_at", threeDaysAgo.toISOString());

  if (!pendingPRs || pendingPRs.length === 0) return;

  for (const pr of pendingPRs) {
    const daysPending = Math.floor(
      (new Date().getTime() - new Date(pr.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    await createNotification(db, {
      user_id: pr.current_approver_id,
      title: "Reminder: PR Menunggu Approval",
      message: `PR ${pr.pr_number} telah menunggu ${daysPending} hari. Mohon segera diproses.`,
      type: "reminder",
      link: `/dashboard/purchasing/pr/${pr.id}`,
      metadata: { pr_id: pr.id, pr_number: pr.pr_number, days: daysPending },
    });
  }
}
