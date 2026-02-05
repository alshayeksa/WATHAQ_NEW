import { z } from "zod";

// ============================================
// Profile schema - linked 1:1 with auth.users
// ============================================
export const profileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  email: z.string().email(),
  avatar_url: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  school_name: z.string().nullable(),
  specialization: z.string().nullable(),
  job_title: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;

export const insertProfileSchema = profileSchema.omit({
  created_at: true,
  updated_at: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;

export const updateProfileSchema = profileSchema.partial().omit({
  id: true,
  email: true,
  created_at: true,
  updated_at: true,
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

// ============================================
// Drive Connection schema - Google Drive tokens
// ============================================
export const driveConnectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider: z.enum(["google", "onedrive"]),
  provider_user_id: z.string(),
  scopes: z.array(z.string()).nullable(),
  last_synced_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type DriveConnection = z.infer<typeof driveConnectionSchema>;

export const insertDriveConnectionSchema = driveConnectionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_synced_at: true,
});

export type InsertDriveConnection = z.infer<typeof insertDriveConnectionSchema>;

// ============================================
// Project schema - main portfolio container
// ============================================
export const projectStatusEnum = z.enum(["active", "archived", "draft"]);

export const projectSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(100),
  description: z.string().nullable().default(null),
  root_drive_id: z.string().nullable(),
  status: projectStatusEnum,
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Project = z.infer<typeof projectSchema>;
export type ProjectStatus = z.infer<typeof projectStatusEnum>;

export const insertProjectSchema = projectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  root_drive_id: true,
}).extend({
  title: z.string().min(1, "عنوان المشروع مطلوب").max(100, "العنوان طويل جداً"),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;

export const updateProjectSchema = projectSchema.partial().omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export type UpdateProject = z.infer<typeof updateProjectSchema>;

// ============================================
// Folder schema - hierarchical folder tree
// ============================================
export const folderSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  drive_folder_id: z.string(),
  folder_name: z.string().min(1).max(100),
  sort_order: z.number().int(),
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Folder = z.infer<typeof folderSchema>;

export const insertFolderSchema = folderSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  drive_folder_id: true,
}).extend({
  folder_name: z.string().min(1, "اسم المجلد مطلوب").max(100, "الاسم طويل جداً"),
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;

export const updateFolderSchema = folderSchema.partial().omit({
  id: true,
  project_id: true,
  created_at: true,
  updated_at: true,
});

export type UpdateFolder = z.infer<typeof updateFolderSchema>;

// ============================================
// Files Metadata schema - cached Google Drive files
// ============================================
export const fileMetadataSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable(),
  drive_file_id: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int().nullable(),
  checksum: z.string().nullable(),
  web_view_link: z.string().nullable(),
  is_deleted: z.boolean().default(false),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

export const insertFileMetadataSchema = fileMetadataSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  is_deleted: true,
  deleted_at: true,
});

export type InsertFileMetadata = z.infer<typeof insertFileMetadataSchema>;

export const updateFileMetadataSchema = fileMetadataSchema.partial().omit({
  id: true,
  project_id: true,
  folder_id: true,
  created_at: true,
  updated_at: true,
});

export type UpdateFileMetadata = z.infer<typeof updateFileMetadataSchema>;

// ============================================
// Share Link schema - QR codes and sharing
// ============================================
export const accessTypeEnum = z.enum(["public", "pin", "google_only"]);

export const shareLinkSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  slug: z.string().min(4).max(50),
  access_type: accessTypeEnum,
  pin_hash: z.string().nullable(),
  is_enabled: z.boolean().default(true),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ShareLink = z.infer<typeof shareLinkSchema>;
export type AccessType = z.infer<typeof accessTypeEnum>;

export const insertShareLinkSchema = shareLinkSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  pin_hash: true,
}).extend({
  pin: z.string().min(4).max(6).optional(),
});

export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;

export const updateShareLinkSchema = shareLinkSchema.partial().omit({
  id: true,
  project_id: true,
  created_at: true,
  updated_at: true,
});

export type UpdateShareLink = z.infer<typeof updateShareLinkSchema>;

// ============================================
// Audit Log schema - activity tracking
// ============================================
export const auditActionEnum = z.enum([
  "PROJECT_CREATE",
  "PROJECT_UPDATE",
  "PROJECT_DELETE",
  "FOLDER_CREATE",
  "FOLDER_DELETE",
  "FILE_UPLOAD",
  "FILE_DELETE",
  "SHARE_LINK_CREATE",
  "SHARE_LINK_UPDATE",
  "SHARE_LINK_ACCESS",
  "USER_LOGIN",
  "USER_LOGOUT",
]);

export const auditLogSchema = z.object({
  id: z.number().int(),
  user_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  action: auditActionEnum,
  payload: z.record(z.unknown()).nullable(),
  ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.string(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditAction = z.infer<typeof auditActionEnum>;

export const insertAuditLogSchema = auditLogSchema.omit({
  id: true,
  created_at: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ============================================
// API Response types
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Auth types
// ============================================
export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

// ============================================
// Drive file types (Google Drive API)
// ============================================
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

// ============================================
// Project with relations (for API responses)
// ============================================
export interface ProjectWithDetails extends Project {
  folders: Folder[];
  files: FileMetadata[];
  share_link?: ShareLink;
}

export interface FolderWithFiles extends Folder {
  files: FileMetadata[];
  subfolders: FolderWithFiles[];
}

// ============================================
// Public view types (for shared links)
// ============================================
export interface PublicProjectView {
  title: string;
  folders: Array<{
    id: string;
    folder_name: string;
    parent_id: string | null;
    files: Array<{
      id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number | null;
      web_view_link: string | null;
    }>;
  }>;
  teacher?: {
    full_name: string | null;
    school_name: string | null;
    specialization: string | null;
    job_title: string | null;
    city: string | null;
    region: string | null;
  };
}

// ============================================
// Repository filter types
// ============================================
export interface ProjectFilters {
  user_id: string;
  status?: ProjectStatus;
  is_deleted?: boolean;
}

export interface FolderFilters {
  project_id: string;
  parent_id?: string | null;
  is_deleted?: boolean;
}

export interface FileFilters {
  project_id?: string;
  folder_id?: string;
  is_deleted?: boolean;
}

export interface ShareLinkFilters {
  project_id?: string;
  slug?: string;
  is_enabled?: boolean;
}
