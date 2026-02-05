import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, CheckCircle, AlertCircle, X, FileWarning } from "lucide-react";
import { getAuthHeaders } from "@/lib/queryClient";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  folderId: string | null;
  files: FileList | null;
  onComplete: () => void;
}

interface UploadState {
  status: "idle" | "checking" | "uploading" | "success" | "error";
  progress: number;
  currentFile: string;
  error?: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  projectId,
  folderId,
  files,
  onComplete,
}: UploadDialogProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    currentFile: "",
  });
  const [duplicateFiles, setDuplicateFiles] = useState<string[]>([]);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (open && files && files.length > 0) {
      checkForDuplicates(files);
    }
  }, [open, files]);

  const checkForDuplicates = async (filesToCheck: FileList) => {
    setUploadState({ status: "checking", progress: 0, currentFile: "" });
    
    try {
      const fileNames = Array.from(filesToCheck).map(f => f.name);
      const authHeaders = await getAuthHeaders();
      
      const res = await fetch(`/api/projects/${projectId}/files/check-duplicates`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_names: fileNames,
          folder_id: folderId,
        }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.duplicates && data.duplicates.length > 0) {
          setDuplicateFiles(data.duplicates);
          setPendingFiles(filesToCheck);
          setShowDuplicateAlert(true);
          setUploadState({ status: "idle", progress: 0, currentFile: "" });
        } else {
          await uploadFiles(filesToCheck, false);
        }
      } else {
        await uploadFiles(filesToCheck, false);
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
      await uploadFiles(filesToCheck, false);
    }
  };

  const uploadFiles = async (filesToUpload: FileList, replace: boolean) => {
    setUploadState({ status: "uploading", progress: 0, currentFile: "" });

    const formData = new FormData();
    Array.from(filesToUpload).forEach((file) => {
      formData.append("files", file);
    });
    if (folderId) {
      formData.append("folder_id", folderId);
    }
    if (replace) {
      formData.append("replace", "true");
    }

    try {
      console.log("Starting upload for", filesToUpload.length, "files");
      const authHeaders = await getAuthHeaders();
      console.log("Auth headers obtained:", Object.keys(authHeaders));

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadState({
            status: "uploading",
            progress: percentComplete,
            currentFile: `جارٍ رفع ${filesToUpload.length} ملف...`,
          });
        }
      });

      xhr.addEventListener("load", () => {
        console.log("Upload response:", xhr.status, xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState({
            status: "success",
            progress: 100,
            currentFile: "",
          });
          setTimeout(() => {
            onComplete();
            onOpenChange(false);
            setUploadState({ status: "idle", progress: 0, currentFile: "" });
          }, 1000);
        } else {
          let errorMsg = "فشل في رفع الملفات";
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.error || errorMsg;
          } catch (e) {}
          setUploadState({
            status: "error",
            progress: 0,
            currentFile: "",
            error: errorMsg,
          });
        }
      });

      xhr.addEventListener("error", () => {
        setUploadState({
          status: "error",
          progress: 0,
          currentFile: "",
          error: "فشل في الاتصال بالخادم",
        });
      });

      xhr.open("POST", `/api/projects/${projectId}/files`);
      
      Object.entries(authHeaders).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-type") {
          xhr.setRequestHeader(key, value as string);
        }
      });

      xhr.withCredentials = true;
      xhr.send(formData);
    } catch (error: any) {
      setUploadState({
        status: "error",
        progress: 0,
        currentFile: "",
        error: error.message || "فشل في رفع الملفات",
      });
    }
  };

  const handleDuplicateReplace = () => {
    setShowDuplicateAlert(false);
    if (pendingFiles) {
      uploadFiles(pendingFiles, true);
    }
  };

  const handleDuplicateSkip = () => {
    setShowDuplicateAlert(false);
    if (pendingFiles) {
      // Filter out duplicate files
      const dt = new DataTransfer();
      Array.from(pendingFiles).forEach((file) => {
        if (!duplicateFiles.includes(file.name)) {
          dt.items.add(file);
        }
      });
      
      if (dt.files.length > 0) {
        uploadFiles(dt.files, false);
      } else {
        // All files were duplicates, just close
        onOpenChange(false);
        setUploadState({ status: "idle", progress: 0, currentFile: "" });
      }
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateAlert(false);
    setPendingFiles(null);
    setDuplicateFiles([]);
    onOpenChange(false);
  };

  const canClose = uploadState.status !== "uploading" && uploadState.status !== "checking";

  return (
    <>
      <Dialog open={open && !showDuplicateAlert} onOpenChange={(newOpen) => {
        if (canClose) {
          onOpenChange(newOpen);
          if (!newOpen) {
            setUploadState({ status: "idle", progress: 0, currentFile: "" });
          }
        }
      }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => !canClose && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {uploadState.status === "uploading" && <Loader2 className="h-5 w-5 animate-spin" />}
              {uploadState.status === "checking" && <Loader2 className="h-5 w-5 animate-spin" />}
              {uploadState.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
              {uploadState.status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
              {uploadState.status === "idle" && <Upload className="h-5 w-5" />}
              {uploadState.status === "checking" ? "جارٍ التحقق..." : 
               uploadState.status === "uploading" ? "جارٍ الرفع..." :
               uploadState.status === "success" ? "تم الرفع بنجاح!" :
               uploadState.status === "error" ? "حدث خطأ" : "رفع الملفات"}
            </DialogTitle>
            <DialogDescription>
              {uploadState.status === "checking" && "جارٍ التحقق من وجود ملفات مكررة..."}
              {uploadState.status === "uploading" && uploadState.currentFile}
              {uploadState.status === "success" && "تم رفع جميع الملفات بنجاح إلى Google Drive"}
              {uploadState.status === "error" && uploadState.error}
              {uploadState.status === "idle" && (files && files.length > 0 ? `${files.length} ملف جاهز للرفع` : "لم يتم اختيار ملفات")}
            </DialogDescription>
          </DialogHeader>

          {(uploadState.status === "uploading" || uploadState.status === "checking") && (
            <div className="space-y-4 py-4">
              <Progress value={uploadState.progress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {uploadState.progress}%
              </p>
            </div>
          )}

          {uploadState.status === "success" && (
            <div className="flex justify-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          )}

          {uploadState.status === "error" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
              {files && files.length > 0 && (
                <Button onClick={() => files && uploadFiles(files, false)}>
                  إعادة المحاولة
                </Button>
              )}
            </DialogFooter>
          )}

          {uploadState.status === "idle" && (!files || files.length === 0) && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-amber-500" />
              ملفات مكررة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              <span>الملفات التالية موجودة مسبقاً في هذا المجلد:</span>
              <ul className="mt-2 list-disc list-inside text-sm">
                {duplicateFiles.map((name, i) => (
                  <li key={i} className="truncate">{name}</li>
                ))}
              </ul>
              <p className="mt-3">هل ترغب في استبدال الملفات الموجودة؟</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={handleDuplicateCancel}>
              إلغاء
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleDuplicateSkip}>
              تخطي المكررات
            </Button>
            <AlertDialogAction onClick={handleDuplicateReplace}>
              استبدال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
