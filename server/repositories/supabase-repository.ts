import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Project,
  InsertProject,
  UpdateProject,
  ProjectFilters,
  Folder,
  InsertFolder,
  UpdateFolder,
  FolderFilters,
  FileMetadata,
  InsertFileMetadata,
  UpdateFileMetadata,
  FileFilters,
  ShareLink,
  InsertShareLink,
  UpdateShareLink,
  ShareLinkFilters,
  InsertAuditLog,
  AuditLog,
  Profile,
  InsertProfile,
  DriveConnection,
  InsertDriveConnection,
  ProjectWithDetails,
} from '@shared/schema';
import crypto from 'crypto';

// Token encryption/decryption helpers
const ENCRYPTION_KEY = process.env.SESSION_SECRET || 'default-encryption-key-32chars!';
const ALGORITHM = 'aes-256-cbc';

function encryptToken(token: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedToken: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is required but not set!");
}
if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required but not set! Backend cannot function without service role access.");
}

// Log which key type we're using (for debugging RLS issues)
console.log("Supabase client initialized with:", {
  url: "SET",
  keyType: "SERVICE_ROLE",
  keyPrefix: supabaseServiceKey.substring(0, 20) + "..."
});

// Create a direct client using Service Role Key which BYPASSES RLS via auth.role() = 'service_role'
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// ============================================
// Profiles Repository
// ============================================
export const profilesRepository = {
  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, region, city, school_name, specialization, job_title, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data;
  },

  async upsert(profile: Partial<InsertProfile> & { id: string }): Promise<Profile | null> {
    console.log("Supabase upsert profile with service role:", profile.id);
    
    // Ensure we have the minimum required fields
    if (!profile.id || !profile.email) {
      console.error("Missing required fields for profile upsert:", { id: !!profile.id, email: !!profile.email });
      throw new Error("Missing required fields for profile upsert");
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name ?? '',
        avatar_url: profile.avatar_url ?? '',
        region: (profile as any).region ?? '',
        city: (profile as any).city ?? '',
        school_name: (profile as any).school_name ?? '',
        specialization: (profile as any).specialization ?? '',
        job_title: (profile as any).job_title ?? '',
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'id'
      })
      .select('id, full_name, email, avatar_url, region, city, school_name, specialization, job_title, created_at, updated_at')
      .single();

    if (error) {
      console.error("Supabase upsert error detail:", error.message, error.code, error.details);
      // If RLS still fails, it means we are definitely NOT using the service role key correctly
      // or the key doesn't have bypass permissions.
      throw error;
    }
    return data;
  },

  async update(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, full_name, email, avatar_url, region, city, school_name, specialization, job_title, created_at, updated_at')
      .single();

    if (error) return null;
    return data;
  },
};

// ============================================
// Drive Connections Repository
// ============================================
export const driveConnectionsRepository = {
  async getByUserId(userId: string, provider: string = 'google'): Promise<DriveConnection | null> {
    const { data, error } = await supabase
      .from('drive_connections')
      .select('id, user_id, provider, provider_user_id, scopes, last_synced_at, created_at, updated_at')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error) return null;
    return data;
  },

  async upsert(connection: InsertDriveConnection & { refresh_token_encrypted: string }): Promise<DriveConnection | null> {
    const { data, error } = await supabase
      .from('drive_connections')
      .upsert(connection, { onConflict: 'user_id,provider' })
      .select('id, user_id, provider, provider_user_id, scopes, last_synced_at, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  },

  async updateLastSynced(userId: string, provider: string = 'google'): Promise<void> {
    await supabase
      .from('drive_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider);
  },

  async delete(userId: string, provider: string = 'google'): Promise<void> {
    await supabase
      .from('drive_connections')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);
  },

  // Store access token and refresh token (encrypted together in refresh_token_encrypted)
  async storeTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    // Store both tokens as JSON in refresh_token_encrypted field
    const tokensJson = JSON.stringify({ accessToken, refreshToken });
    const encryptedTokens = encryptToken(tokensJson);
    
    const { error } = await supabase
      .from('drive_connections')
      .upsert({
        user_id: userId,
        provider: 'google',
        provider_user_id: userId,
        refresh_token_encrypted: encryptedTokens,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });
    
    if (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
    console.log('Tokens stored successfully for user:', userId);
  },

  // Get access token (decrypted)
  async getAccessToken(userId: string, provider: string = 'google'): Promise<string | null> {
    const tokens = await this.getTokens(userId, provider);
    return tokens?.accessToken || null;
  },

  // Get both tokens (decrypted)
  async getTokens(userId: string, provider: string = 'google'): Promise<{ accessToken: string; refreshToken?: string } | null> {
    const { data, error } = await supabase
      .from('drive_connections')
      .select('refresh_token_encrypted')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error) {
      console.log('No drive connection found for user:', userId, error.message);
      return null;
    }
    
    if (!data?.refresh_token_encrypted) {
      console.log('No encrypted token found for user:', userId);
      return null;
    }
    
    try {
      const decrypted = decryptToken(data.refresh_token_encrypted);
      const tokens = JSON.parse(decrypted);
      console.log('Retrieved tokens for user:', userId);
      return tokens;
    } catch (e) {
      console.error('Failed to decrypt/parse token:', e);
      return null;
    }
  },
};

// ============================================
// Projects Repository
// ============================================
export const projectsRepository = {
  async getAll(filters: ProjectFilters): Promise<Project[]> {
    console.log("Supabase projectsRepository.getAll called with filters:", filters);
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', filters.user_id)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.is_deleted !== undefined) {
        query = query.eq('is_deleted', filters.is_deleted);
      } else {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Supabase Error in projectsRepository.getAll:", error);
        throw error;
      }
      console.log("Supabase projectsRepository.getAll result count:", data?.length || 0);
      return data || [];
    } catch (err) {
      console.error("Catch error in projectsRepository.getAll:", err);
      return [];
    }
  },

  async getById(id: string, userId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return data;
  },

  async getByIdWithoutUser(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async getWithDetails(id: string, userId: string): Promise<ProjectWithDetails | null> {
    const project = await this.getById(id, userId);
    if (!project) return null;

    const [foldersResult, filesResult, shareLinkResult] = await Promise.all([
      supabase.from('folders').select('*').eq('project_id', id).eq('is_deleted', false).order('sort_order'),
      supabase.from('files_metadata').select('*').eq('project_id', id).eq('is_deleted', false),
      supabase.from('share_links').select('*').eq('project_id', id).single(),
    ]);

    return {
      ...project,
      folders: foldersResult.data || [],
      files: filesResult.data || [],
      share_link: shareLinkResult.data || undefined,
    };
  },

  async create(project: InsertProject & { root_drive_id?: string }): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        status: project.status || 'active',
        root_drive_id: project.root_drive_id || '',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, userId: string, updates: UpdateProject): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) return null;
    return data;
  },

  async updateWithoutUser(id: string, updates: UpdateProject): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return null;
    return data;
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  },

  async deleteWithoutUser(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    return !error;
  },

  async setRootDriveId(id: string, userId: string, rootDriveId: string): Promise<Project | null> {
    return this.update(id, userId, { root_drive_id: rootDriveId });
  },

  async softDelete(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  },

  async restore(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update({ 
        is_deleted: false, 
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  },

  async hardDelete(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  },
};

// ============================================
// Folders Repository
// ============================================
export const foldersRepository = {
  async getAll(filters: FolderFilters): Promise<Folder[]> {
    let query = supabase
      .from('folders')
      .select('*')
      .eq('project_id', filters.project_id)
      .order('sort_order');

    if (filters.parent_id !== undefined) {
      if (filters.parent_id === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', filters.parent_id);
      }
    }
    
    if (filters.is_deleted !== undefined) {
      query = query.eq('is_deleted', filters.is_deleted);
    } else {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async getByDriveFolderId(driveFolderId: string): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('drive_folder_id', driveFolderId)
      .single();

    if (error) return null;
    return data;
  },

  async create(folder: InsertFolder & { drive_folder_id: string }): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .insert(folder)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateFolder): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return null;
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    return !error;
  },

  async softDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('folders')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async restore(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('folders')
      .update({ 
        is_deleted: false, 
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async hardDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    return !error;
  },

  async getNextSortOrder(projectId: string, parentId: string | null): Promise<number> {
    let query = supabase
      .from('folders')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data } = await query;
    return data && data.length > 0 ? data[0].sort_order + 1 : 0;
  },
};

// ============================================
// Files Metadata Repository
// ============================================
export const filesMetadataRepository = {
  async getAll(filters: FileFilters): Promise<FileMetadata[]> {
    let query = supabase
      .from('files_metadata')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.folder_id) {
      query = query.eq('folder_id', filters.folder_id);
    }
    if (filters.is_deleted !== undefined) {
      query = query.eq('is_deleted', filters.is_deleted);
    } else {
      query = query.eq('is_deleted', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<FileMetadata | null> {
    const { data, error } = await supabase
      .from('files_metadata')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  async getByDriveFileId(driveFileId: string): Promise<FileMetadata | null> {
    const { data, error } = await supabase
      .from('files_metadata')
      .select('*')
      .eq('drive_file_id', driveFileId)
      .single();

    if (error) return null;
    return data;
  },

  async create(file: InsertFileMetadata): Promise<FileMetadata> {
    const { data, error } = await supabase
      .from('files_metadata')
      .insert(file)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateFileMetadata): Promise<FileMetadata | null> {
    const { data, error } = await supabase
      .from('files_metadata')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return null;
    return data;
  },

  async softDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('files_metadata')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async hardDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('files_metadata')
      .delete()
      .eq('id', id);

    return !error;
  },

  async restore(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('files_metadata')
      .update({ 
        is_deleted: false, 
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  },

  async createMany(files: InsertFileMetadata[]): Promise<FileMetadata[]> {
    const { data, error } = await supabase
      .from('files_metadata')
      .insert(files)
      .select('*');

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// Share Links Repository
// ============================================
export const shareLinksRepository = {
  async getByProjectId(projectId: string): Promise<ShareLink | null> {
    console.log("ShareLinks.getByProjectId called with:", projectId);
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log("ShareLinks.getByProjectId error:", error.message, error.code);
      return null;
    }
    
    const shareLink = data && data.length > 0 ? data[0] : null;
    console.log("ShareLinks.getByProjectId found:", shareLink?.id);
    return shareLink;
  },

  async getBySlug(slug: string): Promise<ShareLink | null> {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('slug', slug)
      .eq('is_enabled', true)
      .single();

    if (error) return null;
    
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }
    
    return data;
  },

  async create(shareLink: InsertShareLink): Promise<ShareLink> {
    const insertData: any = {
      project_id: shareLink.project_id,
      slug: shareLink.slug,
      access_type: shareLink.access_type,
      is_enabled: shareLink.is_enabled ?? true,
      expires_at: shareLink.expires_at || null,
    };

    if (shareLink.pin) {
      insertData.pin_hash = crypto.createHash('sha256').update(shareLink.pin).digest('hex');
    }

    const { data, error } = await supabase
      .from('share_links')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateShareLink & { pin?: string }): Promise<ShareLink | null> {
    const updateData: any = { ...updates, updated_at: new Date().toISOString() };
    
    if (updates.pin_hash !== undefined) {
      delete updateData.pin_hash;
    }
    
    if ((updates as any).pin) {
      updateData.pin_hash = crypto.createHash('sha256').update((updates as any).pin).digest('hex');
      delete updateData.pin;
    }

    const { data, error } = await supabase
      .from('share_links')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return null;
    return data;
  },

  async toggleEnabled(id: string, enabled: boolean): Promise<ShareLink | null> {
    return this.update(id, { is_enabled: enabled });
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('id', id);

    return !error;
  },

  async verifyPin(slug: string, pin: string): Promise<boolean> {
    const shareLink = await this.getBySlug(slug);
    if (!shareLink || shareLink.access_type !== 'pin') return false;
    
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
    return shareLink.pin_hash === pinHash;
  },

  generateSlug(): string {
    return crypto.randomBytes(6).toString('base64url');
  },
};

// ============================================
// Audit Logs Repository
// ============================================
export const auditLogsRepository = {
  async create(log: InsertAuditLog): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(log)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async getByUserId(userId: string, limit: number = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getByProjectId(projectId: string, limit: number = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};

// ============================================
// Public View Repository (no auth required)
// ============================================
export const publicViewRepository = {
  async getProjectBySlug(slug: string): Promise<{
    project: Project;
    folders: Folder[];
    files: FileMetadata[];
    teacher?: {
      full_name: string | null;
      school_name: string | null;
      specialization: string | null;
      job_title: string | null;
      city: string | null;
      region: string | null;
    };
  } | null> {
    const shareLink = await shareLinksRepository.getBySlug(slug);
    if (!shareLink) return null;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', shareLink.project_id)
      .single();

    if (projectError || !project) return null;

    const [foldersResult, filesResult, profileResult] = await Promise.all([
      supabase.from('folders').select('*').eq('project_id', project.id).eq('is_deleted', false).order('sort_order'),
      supabase.from('files_metadata').select('*').eq('project_id', project.id).eq('is_deleted', false),
      supabase.from('profiles').select('full_name, school_name, specialization, job_title, city, region').eq('id', project.user_id).single(),
    ]);

    return {
      project,
      folders: foldersResult.data || [],
      files: filesResult.data || [],
      teacher: profileResult.data || undefined,
    };
  },
};
