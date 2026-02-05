import { Readable } from "stream";

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  createdTime?: string;
}

export async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFile> {
  const metadata: any = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  console.log("=== Google Drive Create Folder ===");
  console.log("URL:", `${GOOGLE_DRIVE_API}/files`);
  console.log("Token (first 20 chars):", accessToken?.substring(0, 20) + "...");
  console.log("Metadata:", JSON.stringify(metadata));

  const response = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  console.log("Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("=== Google Drive API Error ===");
    console.error("Status:", response.status);
    console.error("Response:", errorText);
    
    let errorMessage = response.statusText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {}
    
    throw new Error(`Failed to create folder: ${errorMessage}`);
  }

  const result = await response.json();
  console.log("Folder created successfully:", result.id);
  return result;
}

export async function uploadFile(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileData: Buffer,
  parentId?: string
): Promise<DriveFile> {
  const metadata: any = {
    name: fileName,
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const metadataString = JSON.stringify(metadata);
  
  const multipartBody = Buffer.concat([
    Buffer.from(delimiter, 'utf8'),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n', 'utf8'),
    Buffer.from(metadataString, 'utf8'),
    Buffer.from(delimiter, 'utf8'),
    Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`, 'utf8'),
    fileData,
    Buffer.from(closeDelimiter, 'utf8'),
  ]);

  const response = await fetch(
    `${GOOGLE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,thumbnailLink,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upload file: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Failed to delete file: ${error.error?.message || response.statusText}`);
  }
}

export async function trashFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Failed to trash file: ${error.error?.message || response.statusText}`);
  }
}

export async function untrashFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trashed: false }),
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Failed to untrash file: ${error.error?.message || response.statusText}`);
  }
}

export async function permanentDeleteFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Failed to permanently delete file: ${error.error?.message || response.statusText}`);
  }
}

export async function listFiles(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime)");

  const response = await fetch(
    `${GOOGLE_DRIVE_API}/files?q=${query}&fields=${fields}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list files: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function getFile(accessToken: string, fileId: string): Promise<DriveFile> {
  const response = await fetch(
    `${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size,thumbnailLink,webViewLink`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get file: ${error.error?.message || response.statusText}`);
  }

  return response.json();
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to refresh token: ${error.error_description || response.statusText}`);
  }

  return response.json();
}
