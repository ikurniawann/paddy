"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { ActivityLog, ActivityLogState } from "@/types/activity-log";

const STORAGE_KEY = "arkivos_activity_logs";
const MAX_LOGS = 100; // Keep max 100 logs

const ActivityLogContext = createContext<ActivityLogState | undefined>(undefined);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLogs(parsed);
      }
    } catch (error) {
      console.error("Failed to load activity logs:", error);
    }
  }, []);

  // Save to localStorage when logs change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error("Failed to save activity logs:", error);
    }
  }, [logs]);

  const addLog = (log: Omit<ActivityLog, "id" | "timestamp" | "isRead">) => {
    const newLog: ActivityLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, MAX_LOGS);
      return updated;
    });
  };

  const markAsRead = (id: string) => {
    setLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, isRead: true } : log))
    );
  };

  const markAllAsRead = () => {
    setLogs((prev) => prev.map((log) => ({ ...log, isRead: true })));
  };

  const clearAll = () => {
    setLogs([]);
  };

  const clearOlderThan = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    setLogs((prev) =>
      prev.filter((log) => new Date(log.timestamp) > cutoff)
    );
  };

  const unreadCount = useMemo(() => logs.filter((log) => !log.isRead).length, [logs]);

  return (
    <ActivityLogContext.Provider
      value={{ logs, unreadCount, addLog, markAsRead, markAllAsRead, clearAll, clearOlderThan }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLog() {
  const context = useContext(ActivityLogContext);
  if (context === undefined) {
    throw new Error("useActivityLog must be used within ActivityLogProvider");
  }
  return context;
}
