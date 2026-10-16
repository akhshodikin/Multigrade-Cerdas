import { z } from "zod";

export type OutboxAction = "create" | "update" | "delete";
export type OutboxEntityType = "lesson_plan" | "student_assessment" | "teaching_journal";
export type OutboxStatus = "pending" | "syncing" | "failed" | "conflict";

export interface OutboxConflictDetails {
  serverVersion: number;
  serverPayload: Record<string, unknown>;
  conflictingFields: string[];
  message: string;
}

export interface OutboxItem {
  id: string; // Client UUID
  userId: string; // Pengguna pembuat (Keamanan Perangkat Bersama - Ketentuan 4 & 5)
  userName?: string;
  userRole?: string;
  entityType: OutboxEntityType;
  action: OutboxAction;
  clientEntityId: string;
  serverEntityId?: string;
  baseServerVersion: number; // Concurrency check
  payload: Record<string, unknown>;
  clientTimestamp: string;
  status: OutboxStatus;
  retryCount: number;
  errorMessage?: string | null;
  conflictDetails?: OutboxConflictDetails | null;
}

export interface CachedMaterial {
  id: string;
  type: "modul_ajar" | "lkpd" | "atp" | "curriculum_schedule";
  title: string;
  groupId: string;
  subjectId: string;
  grade?: number;
  data: Record<string, unknown>;
  downloadedAt: string;
  version: number;
}

// Data Siswa Minimal Tanpa PII (Ketentuan 3: Zero NIK, phone, or guardian data)
export interface CachedStudent {
  id: string;
  studentCode: string; // "SDN2-A-01"
  displayName: string; // "Ahmad"
  classId: number;
  groupId: string;
}

export interface SyncHistoryEntry {
  id: string;
  userId: string;
  userName?: string;
  syncedAt: string;
  totalSynced: number;
  totalFailed: number;
  totalConflicts: number;
  status: "success" | "partial" | "failed";
  details: string;
}

export interface EmergencyBackupDump {
  version: number;
  exportedAt: string;
  schoolName: string;
  userId: string;
  outboxItems: OutboxItem[];
  cachedMaterials: CachedMaterial[];
  cachedStudents: CachedStudent[];
}

export interface SyncBatchResponse {
  success: boolean;
  timestamp: string;
  results: Array<{
    clientQueueId: string;
    status: "synced" | "conflict" | "rejected";
    serverEntityId?: string;
    serverVersion?: number;
    errorMessage?: string;
    conflictDetails?: OutboxConflictDetails;
  }>;
}
