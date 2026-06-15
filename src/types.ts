/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'moderator' | 'user';

export interface PublicProfile {
  displayName: string;
  role: UserRole;
  avatarColor: string;
  updatedAt: any; // Firestore Timestamp or FieldValue
}

export interface PrivateInfo {
  email: string;
  createdAt: any; // Firestore Timestamp
  lastLogin: any; // Firestore Timestamp
  providerId: string;
}

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  action: 'LOGIN' | 'REGISTER' | 'PROFILE_RENAME' | 'ROLE_CHANGE';
  details: string;
  timestamp: any; // Firestore Timestamp
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
