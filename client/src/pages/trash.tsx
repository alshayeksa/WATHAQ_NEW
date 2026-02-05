import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowRight, 
  Trash2, 
  RotateCcw, 
  File, 
  Folder,
  AlertTriangle,
} from "lucide-react";
import type { FileMetadata, Folder as FolderType, Project } from "@shared/schema";

interface TrashData {
  files: FileMetadata[];
  folders: FolderType[];
}

export default function TrashPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: trashData, isLoading } = useQuery<TrashData>({
    queryKey: ["/api/projects", projectId, "trash"],
    enabled: !!projectId,
  });

  const restoreFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("POST", `/api/files/${fileId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم استعادة الملف بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في استعادة الملف", variant: "destructive" });
    },
  });

  const restoreFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return apiRequest("POST", `/api/folders/${folderId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "تم استعادة المجلد بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في استعادة المجلد", variant: "destructive" });
    },
  });

  const permanentDeleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("DELETE", `/api/files/${fileId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "trash"] });
      toast({ title: "تم حذف الملف نهائياً" });
    },
    onError: () => {
      toast({ title: "فشل في حذف الملف", variant: "destructive" });
    },
  });

  const permanentDeleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return apiRequest("DELETE", `/api/folders/${folderId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "trash"] });
      toast({ title: "تم حذف المجلد نهائياً" });
    },
    onError: () => {
      toast({ title: "فشل في حذف المجلد", variant: "destructive" });
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/projects/${projectId}/trash`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "trash"] });
      toast({ title: "تم تفريغ سلة المهملات" });
      setEmptyTrashDialogOpen(false);
    },
    onError: () => {
      toast({ title: "فشل في تفريغ سلة المهملات", variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set<string>();
    trashData?.files.forEach(f => allIds.add(`file-${f.id}`));
    trashData?.folders.forEach(f => allIds.add(`folder-${f.id}`));
    setSelectedItems(allIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleRestoreSelected = async () => {
    const items = Array.from(selectedItems);
    for (const id of items) {
      if (id.startsWith("file-")) {
        await restoreFileMutation.mutateAsync(id.replace("file-", ""));
      } else if (id.startsWith("folder-")) {
        await restoreFolderMutation.mutateAsync(id.replace("folder-", ""));
      }
    }
    setSelectedItems(new Set());
  };

  const handleDeleteSelectedPermanently = async () => {
    const items = Array.from(selectedItems);
    for (const id of items) {
      if (id.startsWith("file-")) {
        await permanentDeleteFileMutation.mutateAsync(id.replace("file-", ""));
      } else if (id.startsWith("folder-")) {
        await permanentDeleteFolderMutation.mutateAsync(id.replace("folder-", ""));
      }
    }
    setSelectedItems(new Set());
    setPermanentDeleteDialogOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalItems = (trashData?.files.length || 0) + (trashData?.folders.length || 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation(`/project/${projectId}`)}
                data-testid="button-back"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trash2 className="h-6 w-6 text-muted-foreground" />
                <h1 className="text-xl font-bold">سلة المهملات</h1>
                {project && (
                  <span className="text-sm text-muted-foreground">
                    - {project.title}
                  </span>
                )}
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {selectedItems.size > 0 && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-sm">
                  تم تحديد {selectedItems.size} عنصر
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    إلغاء التحديد
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRestoreSelected}
                    disabled={restoreFileMutation.isPending || restoreFolderMutation.isPending}
                    data-testid="button-restore-selected"
                  >
                    <RotateCcw className="h-4 w-4 ml-2" />
                    استعادة المحدد
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPermanentDeleteDialogOpen(true)}
                    data-testid="button-delete-selected"
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف نهائياً
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {totalItems} عنصر في سلة المهملات
            </span>
            {totalItems > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={selectedItems.size === totalItems ? clearSelection : selectAll}
                data-testid="button-select-all"
              >
                {selectedItems.size === totalItems ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </Button>
            )}
          </div>
          {totalItems > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEmptyTrashDialogOpen(true)}
              data-testid="button-empty-trash"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              تفريغ سلة المهملات
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : totalItems === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Trash2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">سلة المهملات فارغة</p>
              <p className="text-sm mt-2">
                عند حذف الملفات أو المجلدات، ستظهر هنا
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {trashData?.folders.map(folder => (
              <Card
                key={`folder-${folder.id}`}
                className={`hover-elevate ${
                  selectedItems.has(`folder-${folder.id}`) ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`card-trash-folder-${folder.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedItems.has(`folder-${folder.id}`)}
                      onCheckedChange={() => toggleSelect(`folder-${folder.id}`)}
                      data-testid={`checkbox-folder-${folder.id}`}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder className="h-8 w-8 text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.folder_name}</p>
                        <p className="text-xs text-muted-foreground">
                          تم الحذف: {formatDate(folder.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => restoreFolderMutation.mutate(folder.id)}
                        disabled={restoreFolderMutation.isPending}
                        title="استعادة"
                        data-testid={`button-restore-folder-${folder.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => permanentDeleteFolderMutation.mutate(folder.id)}
                        disabled={permanentDeleteFolderMutation.isPending}
                        title="حذف نهائياً"
                        data-testid={`button-delete-folder-${folder.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {trashData?.files.map(file => (
              <Card
                key={`file-${file.id}`}
                className={`hover-elevate ${
                  selectedItems.has(`file-${file.id}`) ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`card-trash-file-${file.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedItems.has(`file-${file.id}`)}
                      onCheckedChange={() => toggleSelect(`file-${file.id}`)}
                      data-testid={`checkbox-file-${file.id}`}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="h-8 w-8 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          تم الحذف: {formatDate(file.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => restoreFileMutation.mutate(file.id)}
                        disabled={restoreFileMutation.isPending}
                        title="استعادة"
                        data-testid={`button-restore-file-${file.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => permanentDeleteFileMutation.mutate(file.id)}
                        disabled={permanentDeleteFileMutation.isPending}
                        title="حذف نهائياً"
                        data-testid={`button-delete-file-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تفريغ سلة المهملات
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف جميع العناصر ({totalItems}) نهائياً من سلة المهملات وجوجل درايف.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => emptyTrashMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={emptyTrashMutation.isPending}
              data-testid="button-confirm-empty-trash"
            >
              {emptyTrashMutation.isPending ? "جاري الحذف..." : "تفريغ السلة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              حذف نهائي
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف {selectedItems.size} عنصر نهائياً من سلة المهملات وجوجل درايف.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelectedPermanently}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={permanentDeleteFileMutation.isPending || permanentDeleteFolderMutation.isPending}
              data-testid="button-confirm-delete-selected"
            >
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
