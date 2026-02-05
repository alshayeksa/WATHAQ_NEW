import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Folder, 
  File, 
  Plus, 
  Upload, 
  ChevronLeft,
  Home,
  MoreVertical,
  Trash2,
  ExternalLink,
  Image,
  FileText,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  FolderPlus,
  Loader2,
  ArrowRight,
  AlertCircle,
  LayoutGrid,
  List,
  AlertTriangle
} from "lucide-react";
import { UploadDialog } from "@/components/upload-dialog";
import type { Folder as FolderType, FileMetadata } from "@shared/schema";

interface FileBrowserProps {
  projectId: string;
  folders: FolderType[];
  files: FileMetadata[];
  currentFolderId: string | null;
  loading: boolean;
  onNavigate: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onUploadFiles: () => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType === "application/pdf") return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 ب";
  const k = 1024;
  const sizes = ["ب", "ك.ب", "م.ب", "ج.ب"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function FileBrowser({
  projectId,
  folders,
  files,
  currentFolderId,
  loading,
  onNavigate,
  onCreateFolder,
  onUploadFiles,
  onDeleteFolder,
  onDeleteFile,
}: FileBrowserProps) {
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<FileList | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setFilesToUpload(droppedFiles);
      setUploadDialogOpen(true);
    }
  }, []);

  const currentFolders = folders.filter(f => f.parent_id === currentFolderId);
  const currentFiles = files.filter(f => 
    currentFolderId === null 
      ? (f.folder_id === null || f.folder_id === "root" || !folders.find(fo => fo.id === f.folder_id))
      : f.folder_id === currentFolderId
  );

  const breadcrumbs = [];
  let folder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  while (folder) {
    breadcrumbs.unshift(folder);
    folder = folder.parent_id ? folders.find(f => f.id === folder!.parent_id) : null;
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    setFolderError(null);
    try {
      await onCreateFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName("");
      setCreateFolderOpen(false);
    } catch (error: any) {
      if (error?.message?.includes("موجود بالفعل") || error?.code === "DUPLICATE_FOLDER") {
        setFolderError("هذا المجلد موجود بالفعل، يرجى اختيار اسم آخر");
      } else {
        setFolderError("فشل في إنشاء المجلد");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    // Copy files to a new DataTransfer to preserve them after clearing input
    const dt = new DataTransfer();
    Array.from(selectedFiles).forEach(file => dt.items.add(file));
    
    setFilesToUpload(dt.files);
    setUploadDialogOpen(true);
    
    // Clear input after copying files
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadComplete = () => {
    onUploadFiles();
    setFilesToUpload(null);
  };

  const handleFileClick = (fileId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedFiles);
      for (let i = start; i <= end; i++) {
        newSelected.add(currentFiles[i].id);
      }
      setSelectedFiles(newSelected);
      // Update lastSelectedIndex to the end of the range for successive shift selections
      setLastSelectedIndex(index);
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+click: toggle single
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      setSelectedFiles(newSelected);
      setLastSelectedIndex(index);
    } else {
      // Regular click: select only this
      setSelectedFiles(new Set([fileId]));
      setLastSelectedIndex(index);
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === currentFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(currentFiles.map(f => f.id)));
    }
  };

  const handleBulkDelete = async () => {
    const fileIds = Array.from(selectedFiles);
    const total = fileIds.length;
    const failedIds: string[] = [];
    
    setIsDeleting(true);
    setDeleteProgress({ current: 0, total });
    
    for (let i = 0; i < fileIds.length; i++) {
      try {
        await onDeleteFile(fileIds[i]);
      } catch (error) {
        failedIds.push(fileIds[i]);
      }
      setDeleteProgress({ current: i + 1, total });
    }
    
    setIsDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteProgress({ current: 0, total: 0 });
    
    const successCount = total - failedIds.length;
    
    if (failedIds.length === 0) {
      setSelectedFiles(new Set());
      setLastSelectedIndex(null);
      toast({
        title: "تم بنجاح",
        description: `تم نقل ${total === 1 ? "الملف" : `${total} ملفات`} إلى سلة المهملات بنجاح`,
      });
    } else {
      setSelectedFiles(new Set(failedIds));
      toast({
        variant: "destructive",
        title: "نقل جزئي إلى سلة المهملات",
        description: `تم نقل ${successCount} ${successCount === 1 ? "ملف" : "ملفات"} وفشل نقل ${failedIds.length} ${failedIds.length === 1 ? "ملف" : "ملفات"}`,
      });
    }
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
    setLastSelectedIndex(null);
  };

  // Clear selection when folder changes or files change
  useEffect(() => {
    setSelectedFiles(new Set());
    setLastSelectedIndex(null);
  }, [currentFolderId, files]);

  return (
    <div 
      ref={dropZoneRef}
      className={`space-y-4 relative transition-all duration-200 min-h-[calc(100vh-200px)] ${
        isDragOver ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">أفلت الملفات هنا للرفع</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(null)}
            className="gap-1"
            data-testid="button-nav-home"
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </Button>
          {breadcrumbs.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(folder.id)}
                className={index === breadcrumbs.length - 1 ? "font-medium" : ""}
                data-testid={`button-nav-folder-${folder.id}`}
              >
                {folder.folder_name}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateFolderOpen(true)}
            data-testid="button-new-folder"
          >
            <FolderPlus className="h-4 w-4 ml-2" />
            مجلد جديد
          </Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadDialogOpen}
            data-testid="button-upload-files"
          >
            {uploadDialogOpen ? (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 ml-2" />
            )}
            رفع ملفات
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
        </div>
      </div>

      {/* Selection toolbar */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-3 gap-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedFiles.size === currentFiles.length && currentFiles.length > 0}
              onCheckedChange={handleSelectAll}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm font-medium">
              تم تحديد {selectedFiles.size} {selectedFiles.size === 1 ? "ملف" : "ملفات"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              data-testid="button-clear-selection"
            >
              إلغاء التحديد
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              data-testid="button-delete-selected"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف المحدد
            </Button>
          </div>
        </div>
      )}

      {currentFolderId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const parent = folders.find(f => f.id === currentFolderId);
            onNavigate(parent?.parent_id || null);
          }}
          className="gap-2 text-muted-foreground"
          data-testid="button-go-back"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-12 w-12 mx-auto mb-3" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : currentFolders.length === 0 && currentFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">لا توجد ملفات بعد</h3>
          <p className="text-sm text-muted-foreground mb-4">
            أنشئ مجلداً أو ارفع ملفات للبدء.
          </p>
          <div className="flex gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCreateFolderOpen(true)}
            >
              <FolderPlus className="h-4 w-4 ml-2" />
              مجلد جديد
            </Button>
            <Button 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 ml-2" />
              رفع ملفات
            </Button>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {currentFolders.map((folder) => (
            <Card 
              key={folder.id} 
              className="hover-elevate cursor-pointer group"
              onClick={() => onNavigate(folder.id)}
              data-testid={`card-folder-${folder.id}`}
            >
              <CardContent className="p-4 text-center relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Folder className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium truncate" title={folder.folder_name}>
                  {folder.folder_name}
                </p>
              </CardContent>
            </Card>
          ))}

          {currentFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.mime_type);
            const isSelected = selectedFiles.has(file.id);
            return (
              <Card 
                key={file.id} 
                className={`hover-elevate group cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
                onClick={(e) => handleFileClick(file.id, index, e)}
                data-testid={`card-file-${file.id}`}
              >
                <CardContent className="p-4 text-center relative">
                  <div 
                    className={`absolute top-2 right-2 transition-opacity ${
                      isSelected || selectedFiles.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileClick(file.id, index, e);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      data-testid={`checkbox-file-${file.id}`}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {file.web_view_link && (
                        <DropdownMenuItem
                          onClick={() => window.open(file.web_view_link!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 ml-2" />
                          فتح في درايف
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDeleteFile(file.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium truncate mb-1" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {formatFileSize(file.size_bytes || 0)}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-1">
          {currentFolders.map((folder) => (
            <Card 
              key={folder.id} 
              className="hover-elevate cursor-pointer group"
              onClick={() => onNavigate(folder.id)}
              data-testid={`card-folder-${folder.id}`}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Folder className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{folder.folder_name}</p>
                  <p className="text-xs text-muted-foreground">مجلد</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}

          {currentFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.mime_type);
            const isSelected = selectedFiles.has(file.id);
            return (
              <Card 
                key={file.id} 
                className={`hover-elevate group cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
                onClick={(e) => handleFileClick(file.id, index, e)}
                data-testid={`card-file-${file.id}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div 
                    className={`transition-opacity ${
                      isSelected || selectedFiles.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileClick(file.id, index, e);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      data-testid={`checkbox-file-${file.id}`}
                    />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size_bytes || 0)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {file.web_view_link && (
                        <DropdownMenuItem
                          onClick={() => window.open(file.web_view_link!, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 ml-2" />
                          فتح في درايف
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => onDeleteFile(file.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 ml-2" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createFolderOpen} onOpenChange={(open) => {
        setCreateFolderOpen(open);
        if (!open) {
          setFolderError(null);
          setNewFolderName("");
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>إنشاء مجلد جديد</DialogTitle>
            <DialogDescription>
              أدخل اسماً للمجلد الجديد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="اسم المجلد"
              value={newFolderName}
              onChange={(e) => {
                setNewFolderName(e.target.value);
                setFolderError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              data-testid="input-folder-name"
              className={folderError ? "border-destructive" : ""}
            />
            {folderError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{folderError}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCreateFolderOpen(false)}
              disabled={isCreating}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isCreating}
              data-testid="button-create-folder"
            >
              {isCreating && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
        folderId={currentFolderId}
        files={filesToUpload}
        onComplete={handleUploadComplete}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => !isDeleting && setDeleteConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">
                {isDeleting ? "جاري الحذف..." : "تأكيد الحذف"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base" asChild>
              <div>
                {isDeleting ? (
                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      حذف {deleteProgress.current} من أصل {deleteProgress.total}
                    </p>
                    <Progress 
                      value={deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0} 
                      className="h-3"
                    />
                    <p className="text-center text-sm text-muted-foreground">
                      يرجى الانتظار...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                      <p className="text-muted-foreground">
                        سيتم نقل <span className="font-bold text-foreground">{selectedFiles.size}</span> {selectedFiles.size === 1 ? "ملف" : "ملفات"} إلى سلة المهملات.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        يمكنك استعادة الملفات لاحقاً من سلة المهملات.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isDeleting && (
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                data-testid="button-confirm-delete"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                نقل إلى سلة المهملات
              </AlertDialogAction>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
