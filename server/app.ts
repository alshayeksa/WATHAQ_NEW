import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { storage, type FileRecord } from "./storage";
import * as googleDrive from "./google-drive";
import { nanoid } from "nanoid";
import type { Project, Folder, ShareLink } from "@shared/schema";

type Variables = {
  userId: string | null;
  userEmail: string | null;
};

export const app = new Hono<{ Variables: Variables }>();

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOriginPatterns = isProduction
  ? [/\.pages\.dev$/, /\.onrender\.com$/, /\.replit\.dev$/, /\.replit\.app$/]
  : [];

app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (!isProduction) return origin;
    
    if (allowedOrigins.includes(origin)) return origin;
    if (corsOriginPatterns.some((pattern) => pattern.test(origin))) return origin;
    
    console.warn("CORS rejected origin:", origin);
    return null;
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-user-id", "x-access-token"],
}));

app.use("*", logger());

function decodeJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    // Use Buffer for Node.js compatibility (works in both Node and Workers)
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    let decoded: string;
    
    if (typeof Buffer !== "undefined") {
      // Node.js environment
      decoded = Buffer.from(base64, "base64").toString("utf-8");
    } else if (typeof atob !== "undefined") {
      // Browser/Workers environment
      decoded = atob(base64);
    } else {
      return null;
    }
    
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

app.use("/api/*", async (c, next) => {
  const accessToken = c.req.header("x-access-token");
  const userIdHeader = c.req.header("x-user-id");

  if (accessToken) {
    const decoded = decodeJwt(accessToken);
    if (decoded?.sub) {
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        c.set("userId", null);
        c.set("userEmail", null);
      } else if (userIdHeader && userIdHeader !== decoded.sub) {
        c.set("userId", null);
        c.set("userEmail", null);
      } else {
        c.set("userId", decoded.sub);
        c.set("userEmail", decoded.email || "");
      }
    } else {
      c.set("userId", null);
      c.set("userEmail", null);
    }
  } else if (!isProduction && userIdHeader) {
    console.warn("Using development auth fallback - not secure for production");
    c.set("userId", userIdHeader);
    c.set("userEmail", "");
  } else {
    c.set("userId", null);
    c.set("userEmail", null);
  }

  await next();
});

function requireAuth(c: any): string | null {
  const userId = c.get("userId");
  if (!userId) return null;
  return userId;
}

async function getProviderToken(userId: string): Promise<string | null> {
  const tokens = await storage.getProviderToken(userId);
  if (!tokens?.token) return null;
  return tokens.token;
}

async function getValidProviderToken(userId: string): Promise<string | null> {
  const tokens = await storage.getProviderToken(userId);
  if (!tokens?.token) {
    console.log("No token found for user:", userId);
    return null;
  }

  try {
    const testResponse = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user",
      { headers: { Authorization: `Bearer ${tokens.token}` } }
    );

    if (testResponse.ok) {
      console.log("Current token is valid");
      return tokens.token;
    }

    console.log("Current token failed with status:", testResponse.status);

    if (tokens.refreshToken) {
      console.log("Attempting to refresh token...");
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error("Missing Google OAuth credentials for token refresh");
        return null;
      }

      try {
        const refreshed = await googleDrive.refreshAccessToken(
          clientId,
          clientSecret,
          tokens.refreshToken
        );
        console.log("Token refreshed successfully");

        storage.clearProviderTokenCache(userId);
        await storage.storeProviderToken(userId, refreshed.access_token, tokens.refreshToken);

        return refreshed.access_token;
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        return null;
      }
    } else {
      console.log("No refresh token available");
      return null;
    }
  } catch (error) {
    console.error("Error validating token:", error);
    return tokens.token;
  }
}

app.post("/api/auth/store-token", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, provider_token, provider_refresh_token } = body;

    console.log("Store token request received for user:", user_id, "token exists:", !!provider_token);

    if (!user_id || !provider_token) {
      console.warn("Missing required fields in store-token request");
      return c.json({ error: "Missing required fields" }, 400);
    }

    const callerUserId = c.get("userId");
    console.log("Caller user from token:", callerUserId);

    if (!callerUserId) {
      console.warn("No valid token found in request");
      return c.json({ error: "Unauthorized - valid token required" }, 401);
    }

    if (callerUserId !== user_id) {
      console.warn("User ID mismatch:", callerUserId, "vs", user_id);
      return c.json({ error: "Cannot store token for another user" }, 403);
    }

    console.log("Storing token for user:", user_id);
    storage.clearProviderTokenCache(user_id);
    await storage.storeProviderToken(user_id, provider_token, provider_refresh_token);
    console.log("Provider token stored successfully for user:", user_id);
    return c.json({ success: true });
  } catch (error) {
    console.error("Store token error:", error);
    return c.json({ error: "Failed to store token" }, 500);
  }
});

app.post("/api/auth/sync-profile", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { email, full_name, avatar_url } = body;

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    let existingProfile;
    try {
      existingProfile = await storage.getProfile(userId);
    } catch (dbError) {
      console.error("Error fetching profile from DB:", dbError);
    }

    const profileData: any = { id: userId, email };
    if (!existingProfile?.full_name) profileData.full_name = full_name || "";
    if (!existingProfile?.avatar_url) profileData.avatar_url = avatar_url || "";

    const profile = await storage.upsertProfile(profileData);
    return c.json(profile);
  } catch (error: any) {
    console.error("Sync profile error:", error.message, error.stack);
    return c.json({ error: "Failed to sync profile", details: error.message }, 500);
  }
});

app.get("/api/profile", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const profile = await storage.getProfile(userId);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    return c.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

app.patch("/api/profile", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { full_name, school_name, specialization, job_title, region, city } = body;

    const updates: Record<string, any> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (school_name !== undefined) updates.school_name = school_name;
    if (specialization !== undefined) updates.specialization = specialization;
    if (job_title !== undefined) updates.job_title = job_title;
    if (region !== undefined) updates.region = region;
    if (city !== undefined) updates.city = city;

    const profile = await storage.updateProfile(userId, updates);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    return c.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

app.get("/api/auth/drive-status", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const token = await getValidProviderToken(userId);

    if (!token) {
      return c.json({
        connected: false,
        reason: "no_token",
        message: "لم يتم ربط حسابك بجوجل درايف. الرجاء إعادة تسجيل الدخول لربط الحساب.",
      });
    }

    try {
      const aboutResponse = await fetch(
        "https://www.googleapis.com/drive/v3/about?fields=user",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (aboutResponse.ok) {
        const aboutData = await aboutResponse.json() as { user?: { emailAddress?: string; displayName?: string } };
        return c.json({
          connected: true,
          email: aboutData.user?.emailAddress,
          name: aboutData.user?.displayName,
        });
      } else {
        return c.json({
          connected: false,
          reason: "token_expired",
          message: "انتهت صلاحية الاتصال بجوجل درايف. الرجاء إعادة تسجيل الدخول.",
        });
      }
    } catch (apiError) {
      console.error("Drive API test error:", apiError);
      return c.json({
        connected: false,
        reason: "api_error",
        message: "حدث خطأ في الاتصال بجوجل درايف.",
      });
    }
  } catch (error) {
    console.error("Drive status check error:", error);
    return c.json({ error: "Failed to check drive status" }, 500);
  }
});

app.get("/api/projects", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projects = await storage.getProjects(userId);
    return c.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    return c.json({ error: "Failed to fetch projects" }, 500);
  }
});

app.get("/api/projects/deleted", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const deletedProjects = await storage.getDeletedProjects(userId);
    return c.json(deletedProjects);
  } catch (error) {
    console.error("Get deleted projects error:", error);
    return c.json({ error: "Failed to get deleted projects" }, 500);
  }
});

app.get("/api/projects/:id", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const folders = await storage.getFolders(project.id);
    const files = await storage.getFiles(project.id);

    return c.json({ ...project, folders, files });
  } catch (error) {
    console.error("Get project error:", error);
    return c.json({ error: "Failed to fetch project" }, 500);
  }
});

app.post("/api/projects", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { title, academicYear, status } = body;

    if (!title) return c.json({ error: "العنوان مطلوب" }, 400);

    const yearSuffix = academicYear || new Date().getFullYear().toString();
    const folderDisplayName = `${title} - ${yearSuffix}`;

    const existingProjects = await storage.getProjects(userId);
    const duplicateProject = existingProjects.find((p) => p.title === folderDisplayName);
    if (duplicateProject) {
      return c.json({ error: "عذراً، لديك مشروع بنفس هذا الاسم مسبقاً" }, 400);
    }

    const providerToken = await getValidProviderToken(userId);

    let driveFolder: { id: string; name: string } | null = null;

    if (providerToken) {
      try {
        console.log("Creating Drive folder:", folderDisplayName);
        driveFolder = await googleDrive.createFolder(providerToken, folderDisplayName);
        console.log("Drive folder created successfully:", driveFolder.id);
      } catch (driveError: any) {
        console.error("Failed to create Drive folder:", driveError.message || driveError);
        return c.json(
          { error: "فشل في إنشاء المجلد في Google Drive. يرجى المحاولة مرة أخرى." },
          500
        );
      }
    } else {
      console.warn("No provider token found for user:", userId);
      return c.json(
        { error: "لم يتم ربط حساب Google Drive. يرجى تسجيل الخروج وتسجيل الدخول مرة أخرى." },
        400
      );
    }

    let project;
    try {
      project = await storage.createProject({
        user_id: userId,
        title: folderDisplayName,
        status: status || "active",
        root_drive_id: driveFolder.id,
      } as any);
    } catch (createError: any) {
      console.error("Database create error, cleaning up Drive folder:", createError);
      try {
        await googleDrive.deleteFile(providerToken, driveFolder.id);
        console.log("Drive folder cleaned up after DB create error");
      } catch (cleanupError) {
        console.error("Failed to cleanup Drive folder:", cleanupError);
      }
      throw createError;
    }

    return c.json(
      {
        ...project,
        message: `تم إنشاء المجلد بنجاح في Google Drive تحت اسم: ${folderDisplayName}`,
        folderDisplayName,
      },
      201
    );
  } catch (error: any) {
    console.error("Create project error:", error);
    return c.json({ error: error.message || "فشل في إنشاء المشروع" }, 500);
  }
});

app.patch("/api/projects/:id", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const body = await c.req.json();
    const { title, status } = body;
    const updates: Partial<Project> = {};
    if (title) updates.title = title;
    if (status) updates.status = status;

    const updated = await storage.updateProject(projectId, updates);
    return c.json(updated);
  } catch (error) {
    console.error("Update project error:", error);
    return c.json({ error: "Failed to update project" }, 500);
  }
});

app.delete("/api/projects/:id", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (project.root_drive_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.trashFile(providerToken, project.root_drive_id);
          console.log("Moved Drive folder to trash:", project.root_drive_id);
        } catch (driveError) {
          console.error("Failed to trash Drive folder:", driveError);
        }
      }
    }

    await storage.softDeleteProject(projectId, userId);
    return c.json({ success: true, message: "تم نقل المشروع إلى سلة المحذوفات" });
  } catch (error) {
    console.error("Delete project error:", error);
    return c.json({ error: "Failed to delete project" }, 500);
  }
});

app.post("/api/projects/:id/restore", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const deletedProjects = await storage.getDeletedProjects(userId);
    const project = deletedProjects.find(p => p.id === projectId);
    if (!project) return c.json({ error: "Project not found in trash" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (project.root_drive_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.untrashFile(providerToken, project.root_drive_id);
          console.log("Restored Drive folder from trash:", project.root_drive_id);
        } catch (driveError) {
          console.error("Failed to restore Drive folder:", driveError);
        }
      }
    }

    await storage.restoreProject(projectId, userId);
    return c.json({ success: true, message: "تم استعادة المشروع بنجاح" });
  } catch (error) {
    console.error("Restore project error:", error);
    return c.json({ error: "Failed to restore project" }, 500);
  }
});

app.delete("/api/projects/:id/permanent", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const deletedProjects = await storage.getDeletedProjects(userId);
    const project = deletedProjects.find(p => p.id === projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (project.root_drive_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.permanentDeleteFile(providerToken, project.root_drive_id);
          console.log("Permanently deleted Drive folder:", project.root_drive_id);
        } catch (driveError) {
          console.error("Failed to delete Drive folder:", driveError);
        }
      }
    }

    await storage.hardDeleteProject(projectId, userId);
    return c.json({ success: true, message: "تم حذف المشروع نهائياً" });
  } catch (error) {
    console.error("Permanent delete project error:", error);
    return c.json({ error: "Failed to permanently delete project" }, 500);
  }
});

app.post("/api/projects/:id/folders", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const body = await c.req.json();
    const { name, parent_folder_id } = body;

    if (!name) return c.json({ error: "اسم المجلد مطلوب" }, 400);

    const providerToken = await getValidProviderToken(userId);
    if (!providerToken) {
      return c.json(
        { error: "لم يتم ربط حساب Google Drive. يرجى إعادة تسجيل الدخول." },
        400
      );
    }

    let parentDriveId = project.root_drive_id;
    if (parent_folder_id) {
      const parentFolder = await storage.getFolder(parent_folder_id);
      if (parentFolder && parentFolder.drive_folder_id) {
        parentDriveId = parentFolder.drive_folder_id;
      }
    }

    let driveFolder: { id: string; name: string };
    try {
      driveFolder = await googleDrive.createFolder(providerToken, name, parentDriveId || undefined);
      console.log("Created Drive folder:", driveFolder.id);
    } catch (driveError: any) {
      console.error("Failed to create Drive folder:", driveError.message || driveError);
      return c.json({ error: "فشل في إنشاء المجلد في Google Drive" }, 500);
    }

    let folder;
    try {
      folder = await storage.createFolder({
        project_id: projectId,
        folder_name: name,
        parent_id: parent_folder_id || null,
        drive_folder_id: driveFolder.id,
        sort_order: 0,
      } as any);
    } catch (dbError) {
      console.error("Database error, cleaning up Drive folder:", dbError);
      try {
        await googleDrive.deleteFile(providerToken, driveFolder.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup Drive folder:", cleanupError);
      }
      throw dbError;
    }

    return c.json(folder, 201);
  } catch (error: any) {
    console.error("Create folder error:", error);
    return c.json({ error: error.message || "Failed to create folder" }, 500);
  }
});

app.delete("/api/folders/:id", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const folderId = c.req.param("id");
    const folder = await storage.getFolder(folderId);
    if (!folder) return c.json({ error: "Folder not found" }, 404);

    const project = await storage.getProject(folder.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (folder.drive_folder_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.trashFile(providerToken, folder.drive_folder_id);
          console.log("Moved Drive folder to trash:", folder.drive_folder_id);
        } catch (driveError) {
          console.error("Failed to trash Drive folder:", driveError);
        }
      }
    }

    await storage.softDeleteFolder(folderId);
    return c.json({ success: true, message: "تم نقل المجلد إلى سلة المحذوفات" });
  } catch (error) {
    console.error("Delete folder error:", error);
    return c.json({ error: "Failed to delete folder" }, 500);
  }
});

app.post("/api/projects/:id/files/check-duplicates", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const body = await c.req.json();
    const { filenames, folder_id } = body;

    if (!Array.isArray(filenames)) {
      return c.json({ error: "filenames must be an array" }, 400);
    }

    const allFiles = await storage.getFiles(projectId);
    const folderFiles = allFiles.filter((f) => f.folder_id === folder_id);

    const existingFilenames = folderFiles.map((f) => f.file_name);
    const duplicates = filenames.filter((name: string) => existingFilenames.includes(name));

    return c.json({ duplicates, hasDuplicates: duplicates.length > 0 });
  } catch (error) {
    console.error("Check duplicates error:", error);
    return c.json({ error: "Failed to check duplicates" }, 500);
  }
});

app.post("/api/projects/:id/files", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const providerToken = await getValidProviderToken(userId);
    if (!providerToken) {
      return c.json(
        { error: "لم يتم ربط حساب Google Drive. يرجى إعادة تسجيل الدخول." },
        400
      );
    }

    const body = await c.req.parseBody();
    const folderId = body["folder_id"] as string | undefined;
    const replaceExisting = body["replace_existing"] === "true";

    let parentDriveId = project.root_drive_id;
    if (folderId) {
      const folder = await storage.getFolder(folderId);
      if (folder && folder.drive_folder_id) {
        parentDriveId = folder.drive_folder_id;
      }
    }

    const uploadedFiles: any[] = [];
    const files = Object.entries(body).filter(([key]) => key.startsWith("files"));

    for (const [, file] of files) {
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (replaceExisting) {
          const allFiles = await storage.getFiles(projectId);
          const existingFile = allFiles.find(
            (f) => f.file_name === file.name && f.folder_id === (folderId || null)
          );
          if (existingFile && existingFile.drive_file_id) {
            try {
              await googleDrive.deleteFile(providerToken, existingFile.drive_file_id);
              await storage.hardDeleteFile(existingFile.id);
              console.log("Deleted existing file:", existingFile.file_name);
            } catch (deleteError) {
              console.error("Failed to delete existing file:", deleteError);
            }
          }
        }

        let driveFile;
        try {
          driveFile = await googleDrive.uploadFile(
            providerToken,
            file.name,
            file.type,
            buffer,
            parentDriveId || undefined
          );
          console.log("Uploaded file to Drive:", driveFile.id);
        } catch (driveError: any) {
          console.error("Failed to upload file to Drive:", driveError.message || driveError);
          continue;
        }

        try {
          const fileRecord = await storage.createFile({
            project_id: projectId,
            folder_id: folderId || null,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: buffer.length,
            drive_file_id: driveFile.id,
            web_view_link: driveFile.webViewLink || null,
          } as any);
          uploadedFiles.push(fileRecord);
        } catch (dbError) {
          console.error("Database error, cleaning up Drive file:", dbError);
          try {
            await googleDrive.deleteFile(providerToken, driveFile.id);
          } catch (cleanupError) {
            console.error("Failed to cleanup Drive file:", cleanupError);
          }
        }
      }
    }

    return c.json(uploadedFiles, 201);
  } catch (error: any) {
    console.error("Upload files error:", error);
    return c.json({ error: error.message || "Failed to upload files" }, 500);
  }
});

app.delete("/api/files/:id", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const fileId = c.req.param("id");
    const file = await storage.getFile(fileId);
    if (!file) return c.json({ error: "File not found" }, 404);

    const project = await storage.getProject(file.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (file.drive_file_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.trashFile(providerToken, file.drive_file_id);
          console.log("Moved Drive file to trash:", file.drive_file_id);
        } catch (driveError) {
          console.error("Failed to trash Drive file:", driveError);
        }
      }
    }

    await storage.deleteFile(fileId);
    return c.json({ success: true, message: "تم نقل الملف إلى سلة المحذوفات" });
  } catch (error) {
    console.error("Delete file error:", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

app.get("/api/projects/:id/trash", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const deletedFiles = await storage.getDeletedFiles(projectId);
    const deletedFolders = await storage.getDeletedFolders(projectId);

    return c.json({ files: deletedFiles, folders: deletedFolders });
  } catch (error) {
    console.error("Get trash error:", error);
    return c.json({ error: "Failed to get trash" }, 500);
  }
});

app.post("/api/files/:id/restore", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const fileId = c.req.param("id");
    const file = await storage.getFile(fileId);
    if (!file || !file.is_deleted) return c.json({ error: "File not found in trash" }, 404);

    const project = await storage.getProject(file.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (file.drive_file_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.untrashFile(providerToken, file.drive_file_id);
          console.log("Restored Drive file from trash:", file.drive_file_id);
        } catch (driveError) {
          console.error("Failed to restore Drive file:", driveError);
        }
      }
    }

    await storage.restoreFile(fileId);
    return c.json({ success: true, message: "تم استعادة الملف بنجاح" });
  } catch (error) {
    console.error("Restore file error:", error);
    return c.json({ error: "Failed to restore file" }, 500);
  }
});

app.delete("/api/files/:id/permanent", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const fileId = c.req.param("id");
    const file = await storage.getFile(fileId);
    if (!file || !file.is_deleted) return c.json({ error: "File not found" }, 404);

    const project = await storage.getProject(file.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (file.drive_file_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.permanentDeleteFile(providerToken, file.drive_file_id);
          console.log("Permanently deleted Drive file:", file.drive_file_id);
        } catch (driveError) {
          console.error("Failed to delete Drive file:", driveError);
        }
      }
    }

    await storage.hardDeleteFile(fileId);
    return c.json({ success: true, message: "تم حذف الملف نهائياً" });
  } catch (error) {
    console.error("Permanent delete file error:", error);
    return c.json({ error: "Failed to permanently delete file" }, 500);
  }
});

app.post("/api/folders/:id/restore", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const folderId = c.req.param("id");
    const folder = await storage.getFolder(folderId);
    if (!folder || !folder.is_deleted) return c.json({ error: "Folder not found in trash" }, 404);

    const project = await storage.getProject(folder.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (folder.drive_folder_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.untrashFile(providerToken, folder.drive_folder_id);
          console.log("Restored Drive folder from trash:", folder.drive_folder_id);
        } catch (driveError) {
          console.error("Failed to restore Drive folder:", driveError);
        }
      }
    }

    await storage.restoreFolder(folderId);
    return c.json({ success: true, message: "تم استعادة المجلد بنجاح" });
  } catch (error) {
    console.error("Restore folder error:", error);
    return c.json({ error: "Failed to restore folder" }, 500);
  }
});

app.delete("/api/folders/:id/permanent", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const folderId = c.req.param("id");
    const folder = await storage.getFolder(folderId);
    if (!folder || !folder.is_deleted) return c.json({ error: "Folder not found" }, 404);

    const project = await storage.getProject(folder.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    if (folder.drive_folder_id) {
      const providerToken = await getValidProviderToken(userId);
      if (providerToken) {
        try {
          await googleDrive.permanentDeleteFile(providerToken, folder.drive_folder_id);
          console.log("Permanently deleted Drive folder:", folder.drive_folder_id);
        } catch (driveError) {
          console.error("Failed to delete Drive folder:", driveError);
        }
      }
    }

    await storage.hardDeleteFolder(folderId);
    return c.json({ success: true, message: "تم حذف المجلد نهائياً" });
  } catch (error) {
    console.error("Permanent delete folder error:", error);
    return c.json({ error: "Failed to permanently delete folder" }, 500);
  }
});

app.delete("/api/projects/:id/trash", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const providerToken = await getValidProviderToken(userId);

    const deletedFiles = await storage.getDeletedFiles(projectId);
    for (const file of deletedFiles) {
      if (file.drive_file_id && providerToken) {
        try {
          await googleDrive.permanentDeleteFile(providerToken, file.drive_file_id);
        } catch (driveError) {
          console.error("Failed to delete Drive file:", driveError);
        }
      }
      await storage.hardDeleteFile(file.id);
    }

    const deletedFolders = await storage.getDeletedFolders(projectId);
    for (const folder of deletedFolders) {
      if (folder.drive_folder_id && providerToken) {
        try {
          await googleDrive.permanentDeleteFile(providerToken, folder.drive_folder_id);
        } catch (driveError) {
          console.error("Failed to delete Drive folder:", driveError);
        }
      }
      await storage.hardDeleteFolder(folder.id);
    }

    return c.json({ success: true, message: "تم تفريغ سلة المحذوفات" });
  } catch (error) {
    console.error("Empty trash error:", error);
    return c.json({ error: "Failed to empty trash" }, 500);
  }
});

app.get("/api/projects/:id/share", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const shareLink = await storage.getShareLink(projectId);
    if (!shareLink) return c.json(null);

    const shareUrl =
      process.env.FRONTEND_URL || process.env.VITE_API_URL || "http://localhost:5000";

    return c.json({
      ...shareLink,
      shareUrl: `${shareUrl}/public/${shareLink.slug}`,
    });
  } catch (error) {
    console.error("Get share link error:", error);
    return c.json({ error: "Failed to get share link" }, 500);
  }
});

app.post("/api/projects/:id/share", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const projectId = c.req.param("id");
    const project = await storage.getProject(projectId);
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    let shareLink = await storage.getShareLink(projectId);

    if (!shareLink) {
      const slug = nanoid(10);
      shareLink = await storage.createShareLink({
        project_id: projectId,
        slug,
        access_type: "public",
        is_enabled: true,
        expires_at: null,
      } as any);
    }

    const shareUrl =
      process.env.FRONTEND_URL || process.env.VITE_API_URL || "http://localhost:5000";

    return c.json(
      {
        ...shareLink,
        shareUrl: `${shareUrl}/public/${shareLink.slug}`,
      },
      201
    );
  } catch (error) {
    console.error("Create share link error:", error);
    return c.json({ error: "Failed to create share link" }, 500);
  }
});

app.patch("/api/share-links/:id", async (c) => {
  try {
    const userId = requireAuth(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const shareLinkId = c.req.param("id");
    const shareLink = await storage.getShareLink(shareLinkId);
    if (!shareLink) return c.json({ error: "Share link not found" }, 404);

    const project = await storage.getProject(shareLink.project_id);
    if (!project || project.user_id !== userId) return c.json({ error: "Forbidden" }, 403);

    const body = await c.req.json();
    const { is_active, is_enabled } = body;

    const updated = await storage.updateShareLink(shareLinkId, { is_enabled: is_enabled ?? is_active });
    return c.json(updated);
  } catch (error) {
    console.error("Update share link error:", error);
    return c.json({ error: "Failed to update share link" }, 500);
  }
});

app.get("/api/public/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    const shareLink = await storage.getShareLinkBySlug(slug);
    if (!shareLink || !shareLink.is_enabled) {
      return c.json({ error: "رابط المشاركة غير صالح أو منتهي الصلاحية" }, 404);
    }

    const project = await storage.getProject(shareLink.project_id);
    if (!project) return c.json({ error: "المشروع غير موجود" }, 404);

    const profile = await storage.getProfile(project.user_id);

    const folders = await storage.getFolders(project.id);
    const files = await storage.getFiles(project.id);

    const publicFiles = await Promise.all(
      files.map(async (file) => {
        if (!file.drive_file_id) return file;

        const providerToken = await getProviderToken(project.user_id);
        if (!providerToken) return file;

        try {
          const driveFile = await googleDrive.getFile(providerToken, file.drive_file_id);
          return {
            ...file,
            webViewLink: driveFile.webViewLink,
            thumbnailLink: driveFile.thumbnailLink,
          };
        } catch {
          return file;
        }
      })
    );

    return c.json({
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
        created_at: project.created_at,
      },
      teacher: profile
        ? {
            full_name: profile.full_name,
            school_name: profile.school_name,
            specialization: profile.specialization,
            job_title: profile.job_title,
            region: profile.region,
            city: profile.city,
          }
        : null,
      folders,
      files: publicFiles,
    });
  } catch (error) {
    console.error("Get public project error:", error);
    return c.json({ error: "حدث خطأ في تحميل المشروع" }, 500);
  }
});

export default app;
