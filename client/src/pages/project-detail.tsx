import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileBrowser } from "@/components/file-browser";
import { ShareDialog } from "@/components/share-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowRight, 
  FolderOpen,
  QrCode,
  ExternalLink,
  Settings,
  Trash2
} from "lucide-react";
import type { Project, Folder, FileMetadata, ShareLink } from "@shared/schema";

interface ProjectData extends Project {
  folders: Folder[];
  files: FileMetadata[];
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  archived: "مؤرشف",
  draft: "مسودة",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);

  const { data: project, isLoading } = useQuery<ProjectData>({
    queryKey: ["/api/projects", id],
    enabled: !!id,
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      const res = await apiRequest("POST", `/api/projects/${id}/folders`, {
        folder_name: name,
        parent_id: parentId,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "فشل في إنشاء المجلد");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "تم إنشاء المجلد بنجاح" });
    },
    onError: (error: Error) => {
      if (!error.message.includes("موجود بالفعل")) {
        toast({ title: error.message || "فشل في إنشاء المجلد", variant: "destructive" });
      }
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return apiRequest("DELETE", `/api/folders/${folderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "تم نقل المجلد إلى سلة المهملات" });
    },
    onError: () => {
      toast({ title: "فشل في نقل المجلد إلى سلة المهملات", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "تم نقل الملف إلى سلة المهملات" });
    },
    onError: () => {
      toast({ title: "فشل في نقل الملف إلى سلة المهملات", variant: "destructive" });
    },
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${id}/share`, {
        access_type: "public",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShareLink(data);
      toast({ title: "تم إنشاء رابط المشاركة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في إنشاء رابط المشاركة", variant: "destructive" });
    },
  });

  const toggleShareLinkMutation = useMutation({
    mutationFn: async ({ linkId, active }: { linkId: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/share-links/${linkId}`, { is_active: active });
      return res.json();
    },
    onSuccess: (data) => {
      setShareLink(data);
    },
    onError: (error: any) => {
      if (error?.message?.includes("404")) {
        setShareLink(null);
        toast({ title: "رابط المشاركة غير موجود. يرجى إنشاء رابط جديد.", variant: "destructive" });
      } else {
        toast({ title: "فشل في تحديث رابط المشاركة", variant: "destructive" });
      }
    },
  });

  const handleOpenShareDialog = async () => {
    setShareDialogOpen(true);
    try {
      // First try to get existing share link
      const res = await fetch(`/api/projects/${id}/share`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setShareLink(data);
      } else {
        // No share link exists, create one automatically
        const createRes = await apiRequest("POST", `/api/projects/${id}/share`, {
          access_type: "public"
        });
        if (createRes.ok) {
          const newLink = await createRes.json();
          setShareLink(newLink);
          toast({ title: "تم إنشاء رابط المشاركة" });
        } else {
          setShareLink(null);
          toast({ title: "فشل في إنشاء رابط المشاركة", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Error with share link:", error);
      setShareLink(null);
    }
  };

  const statusColors = {
    active: "bg-primary/10 text-primary border-primary/20",
    archived: "bg-muted text-muted-foreground border-muted",
    draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">المشروع غير موجود</h1>
          <p className="text-muted-foreground mb-4">
            هذا المشروع غير موجود أو ليس لديك صلاحية الوصول إليه.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة إلى لوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold truncate" data-testid="text-project-title">
                {project.title}
              </h1>
              <Badge 
                variant="outline" 
                className={`text-xs ${statusColors[project.status]}`}
              >
                {statusLabels[project.status] || project.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.root_drive_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://drive.google.com/drive/folders/${project.root_drive_id}`, "_blank")}
                data-testid="button-open-drive"
              >
                <ExternalLink className="h-4 w-4 ml-2" />
                <span className="hidden sm:inline">فتح في درايف</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenShareDialog}
              data-testid="button-share"
            >
              <QrCode className="h-4 w-4 ml-2" />
              <span className="hidden sm:inline">مشاركة</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/project/${id}/trash`)}
              title="سلة المهملات"
              data-testid="button-trash"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <FileBrowser
          projectId={project.id}
          folders={project.folders || []}
          files={project.files || []}
          currentFolderId={currentFolderId}
          loading={false}
          onNavigate={setCurrentFolderId}
          onCreateFolder={async (name, parentId) => {
            await createFolderMutation.mutateAsync({ name, parentId });
          }}
          onUploadFiles={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
            toast({ title: "تم رفع الملفات بنجاح" });
          }}
          onDeleteFolder={async (folderId) => {
            await deleteFolderMutation.mutateAsync(folderId);
          }}
          onDeleteFile={async (fileId) => {
            await deleteFileMutation.mutateAsync(fileId);
          }}
        />
      </main>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        project={project}
        shareLink={shareLink}
        onCreateLink={async (projectId) => {
          await createShareLinkMutation.mutateAsync({});
        }}
        onToggleLink={async (linkId, active) => {
          await toggleShareLinkMutation.mutateAsync({ linkId, active });
        }}
      />
    </div>
  );
}
