import { randomUUID } from "crypto";
import type { 
  Profile, 
  InsertProfile, 
  Project, 
  InsertProject, 
  Folder, 
  InsertFolder,
  FileMetadata,
  InsertFileMetadata,
  ShareLink,
  InsertShareLink 
} from "@shared/schema";
import crypto from "crypto";
import {
  projectsRepository,
  foldersRepository,
  filesMetadataRepository,
  shareLinksRepository,
  profilesRepository,
  driveConnectionsRepository,
} from "./repositories/supabase-repository";

export type FileRecord = FileMetadata;
export type InsertFile = InsertFileMetadata;

export interface IStorage {
  // Profiles
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByEmail(email: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | undefined>;
  upsertProfile(profile: Partial<InsertProfile> & { id: string }): Promise<Profile | undefined>;

  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getDeletedProjects(userId: string): Promise<Project[]>;
  createProject(project: InsertProject & { id?: string }): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<boolean>;
  softDeleteProject(id: string, userId: string): Promise<boolean>;
  restoreProject(id: string, userId: string): Promise<boolean>;
  hardDeleteProject(id: string, userId: string): Promise<boolean>;

  // Folders
  getFolders(projectId: string): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder & { id?: string; drive_folder_id?: string }): Promise<Folder>;
  updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | undefined>;
  deleteFolder(id: string): Promise<boolean>;

  // Files
  getFiles(projectId: string): Promise<FileRecord[]>;
  getFilesByFolder(folderId: string): Promise<FileRecord[]>;
  getFile(id: string): Promise<FileRecord | undefined>;
  getDeletedFiles(projectId: string): Promise<FileRecord[]>;
  createFile(file: InsertFile & { id?: string }): Promise<FileRecord>;
  deleteFile(id: string): Promise<boolean>;
  restoreFile(id: string): Promise<boolean>;
  hardDeleteFile(id: string): Promise<boolean>;
  
  // Folders (trash operations)
  getDeletedFolders(projectId: string): Promise<Folder[]>;
  softDeleteFolder(id: string): Promise<boolean>;
  restoreFolder(id: string): Promise<boolean>;
  hardDeleteFolder(id: string): Promise<boolean>;

  // Share Links
  getShareLink(projectId: string): Promise<ShareLink | undefined>;
  getShareLinkBySlug(slug: string): Promise<ShareLink | undefined>;
  createShareLink(link: Omit<ShareLink, "id" | "created_at"> & { id?: string }): Promise<ShareLink>;
  updateShareLink(id: string, updates: Partial<ShareLink>): Promise<ShareLink | undefined>;
  deleteShareLink(id: string): Promise<boolean>;

  // Token Storage
  storeProviderToken(userId: string, token: string, refreshToken?: string): Promise<void>;
  getProviderToken(userId: string): Promise<{ token: string; refreshToken?: string } | undefined>;
  clearProviderTokenCache(userId: string): void;
}

// Supabase-backed storage implementation
export class SupabaseStorage implements IStorage {
  private providerTokensCache: Map<string, { token: string; refreshToken?: string }> = new Map();

  // Profiles
  async getProfile(id: string): Promise<Profile | undefined> {
    const profile = await profilesRepository.getById(id);
    return profile || undefined;
  }

  async getProfileByEmail(email: string): Promise<Profile | undefined> {
    return undefined;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const result = await profilesRepository.upsert(profile);
    if (!result) throw new Error("Failed to create profile");
    return result;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | undefined> {
    const result = await profilesRepository.update(id, updates);
    return result || undefined;
  }

  async upsertProfile(profile: Partial<InsertProfile> & { id: string }): Promise<Profile | undefined> {
    const result = await profilesRepository.upsert(profile);
    return result || undefined;
  }

  // Projects
  async getProjects(userId: string): Promise<Project[]> {
    return projectsRepository.getAll({ user_id: userId });
  }

  async getProject(id: string): Promise<Project | undefined> {
    const project = await projectsRepository.getByIdWithoutUser(id);
    return project || undefined;
  }

  async createProject(project: InsertProject & { id?: string }): Promise<Project> {
    try {
      console.log("Creating project in Supabase:", project);
      const result = await projectsRepository.create(project);
      if (!result) throw new Error("Failed to create project - no result returned");
      console.log("Project created in Supabase:", result.id);
      return result;
    } catch (error: any) {
      console.error("Error creating project:", error.message, error.code, error.details);
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await projectsRepository.updateWithoutUser(id, updates);
    return result || undefined;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    return projectsRepository.softDelete(id, userId);
  }
  
  async getDeletedProjects(userId: string): Promise<Project[]> {
    return projectsRepository.getAll({ user_id: userId, is_deleted: true });
  }
  
  async softDeleteProject(id: string, userId: string): Promise<boolean> {
    return projectsRepository.softDelete(id, userId);
  }
  
  async restoreProject(id: string, userId: string): Promise<boolean> {
    return projectsRepository.restore(id, userId);
  }
  
  async hardDeleteProject(id: string, userId: string): Promise<boolean> {
    return projectsRepository.hardDelete(id, userId);
  }

  // Folders
  async getFolders(projectId: string): Promise<Folder[]> {
    return foldersRepository.getAll({ project_id: projectId });
  }

  async getFolder(id: string): Promise<Folder | undefined> {
    const folder = await foldersRepository.getById(id);
    return folder || undefined;
  }

  async createFolder(folder: InsertFolder & { id?: string; drive_folder_id?: string }): Promise<Folder> {
    const result = await foldersRepository.create({
      project_id: folder.project_id,
      parent_id: folder.parent_id,
      folder_name: folder.folder_name,
      sort_order: folder.sort_order,
      drive_folder_id: folder.drive_folder_id || '',
      is_deleted: folder.is_deleted ?? false,
      deleted_at: folder.deleted_at ?? null,
    });
    if (!result) throw new Error("Failed to create folder");
    console.log("Folder created in Supabase:", result.id);
    return result;
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | undefined> {
    const result = await foldersRepository.update(id, updates);
    return result || undefined;
  }

  async deleteFolder(id: string): Promise<boolean> {
    return foldersRepository.delete(id);
  }

  // Files
  async getFiles(projectId: string): Promise<FileRecord[]> {
    return filesMetadataRepository.getAll({ project_id: projectId });
  }

  async getFilesByFolder(folderId: string): Promise<FileRecord[]> {
    return filesMetadataRepository.getAll({ folder_id: folderId });
  }

  async getFile(id: string): Promise<FileRecord | undefined> {
    const file = await filesMetadataRepository.getById(id);
    return file || undefined;
  }

  async createFile(file: InsertFile & { id?: string; size?: number; thumbnail_url?: string | null }): Promise<FileRecord> {
    const result = await filesMetadataRepository.create({
      folder_id: file.folder_id,
      project_id: file.project_id,
      drive_file_id: file.drive_file_id,
      file_name: file.file_name,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes ?? (file as any).size ?? null,
      checksum: file.checksum ?? null,
      web_view_link: file.web_view_link ?? null,
    });
    if (!result) throw new Error("Failed to create file");
    console.log("File created in Supabase:", result.id);
    return result;
  }

  async deleteFile(id: string): Promise<boolean> {
    return filesMetadataRepository.softDelete(id);
  }
  
  async getDeletedFiles(projectId: string): Promise<FileRecord[]> {
    return filesMetadataRepository.getAll({ project_id: projectId, is_deleted: true });
  }
  
  async restoreFile(id: string): Promise<boolean> {
    return filesMetadataRepository.restore(id);
  }
  
  async hardDeleteFile(id: string): Promise<boolean> {
    return filesMetadataRepository.hardDelete(id);
  }
  
  async getDeletedFolders(projectId: string): Promise<Folder[]> {
    return foldersRepository.getAll({ project_id: projectId, is_deleted: true });
  }
  
  async softDeleteFolder(id: string): Promise<boolean> {
    return foldersRepository.softDelete(id);
  }
  
  async restoreFolder(id: string): Promise<boolean> {
    return foldersRepository.restore(id);
  }
  
  async hardDeleteFolder(id: string): Promise<boolean> {
    return foldersRepository.hardDelete(id);
  }

  // Share Links
  async getShareLink(projectId: string): Promise<ShareLink | undefined> {
    const link = await shareLinksRepository.getByProjectId(projectId);
    return link || undefined;
  }

  async getShareLinkBySlug(slug: string): Promise<ShareLink | undefined> {
    const link = await shareLinksRepository.getBySlug(slug);
    return link || undefined;
  }

  async createShareLink(link: Omit<ShareLink, "id" | "created_at" | "updated_at"> & { id?: string; is_active?: boolean; pin?: string }): Promise<ShareLink> {
    const result = await shareLinksRepository.create({
      project_id: link.project_id,
      slug: link.slug,
      access_type: link.access_type,
      is_enabled: link.is_enabled ?? link.is_active ?? true,
      expires_at: link.expires_at,
      pin: link.pin,
    });
    if (!result) throw new Error("Failed to create share link");
    console.log("Share link created in Supabase:", result.id);
    return result;
  }

  async updateShareLink(id: string, updates: Partial<ShareLink>): Promise<ShareLink | undefined> {
    const result = await shareLinksRepository.update(id, updates);
    return result || undefined;
  }

  async deleteShareLink(id: string): Promise<boolean> {
    return shareLinksRepository.delete(id);
  }

  // Token Storage - uses Supabase for persistence
  async storeProviderToken(userId: string, token: string, refreshToken?: string): Promise<void> {
    await driveConnectionsRepository.storeTokens(userId, token, refreshToken);
    this.providerTokensCache.set(userId, { token, refreshToken });
  }

  async getProviderToken(userId: string): Promise<{ token: string; refreshToken?: string } | undefined> {
    const cached = this.providerTokensCache.get(userId);
    if (cached) return cached;
    
    const tokens = await driveConnectionsRepository.getTokens(userId);
    if (tokens?.accessToken) {
      const result = { token: tokens.accessToken, refreshToken: tokens.refreshToken };
      this.providerTokensCache.set(userId, result);
      return result;
    }
    return undefined;
  }
  
  // Clear cached token (used after refresh)
  clearProviderTokenCache(userId: string): void {
    this.providerTokensCache.delete(userId);
  }
}

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

export const storage = new SupabaseStorage();
