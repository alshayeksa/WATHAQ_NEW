import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { DriveConnectionStatus, DriveConnectionBadge } from "@/components/drive-connection-status";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Search, 
  FolderOpen,
  LogOut,
  User,
  LayoutGrid,
  Trash2,
  QrCode
} from "lucide-react";
import type { Project, ShareLink } from "@shared/schema";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import appLogo from "@/assets/logo.png";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived" | "draft">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [showQRGenerator, setShowQRGenerator] = useState(false);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; academicYear?: string; description?: string; status: string }) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      const message = data.message || "تم إنشاء المشروع بنجاح";
      toast({ title: message });
    },
    onError: (error: Error) => {
      // Error message format from apiRequest: "status: {json or text}"
      let errorMessage = "فشل في إنشاء المشروع";
      try {
        const errorText = error.message;
        // Try to parse JSON error from the message
        const colonIndex = errorText.indexOf(': ');
        if (colonIndex > 0) {
          const jsonPart = errorText.substring(colonIndex + 2);
          const parsed = JSON.parse(jsonPart);
          errorMessage = parsed.error || errorMessage;
        }
      } catch {
        // If parsing fails, use error message directly if it contains Arabic
        if (error.message.includes('عذراً') || error.message.includes('فشل')) {
          errorMessage = error.message;
        }
      }
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      return apiRequest("PATCH", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "تم تحديث المشروع بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث المشروع", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "تم نقل المشروع إلى سلة المهملات" });
    },
    onError: () => {
      toast({ title: "فشل في نقل المشروع إلى سلة المهملات", variant: "destructive" });
    },
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/share`, { 
        access_type: "public"
      });
      return res.json();
    },
    onSuccess: (data) => {
      setShareLink(data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenProject = (project: Project) => {
    setLocation(`/project/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    setEditProject(project);
    setCreateDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setDeleteProject(project);
  };

  const handleShareProject = async (project: Project) => {
    setShareProject(project);
    try {
      // First try to get existing share link
      const res = await fetch(`/api/projects/${project.id}/share`, {
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
        const createRes = await apiRequest("POST", `/api/projects/${project.id}/share`, {
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

  const handleArchiveProject = async (project: Project) => {
    const newStatus = project.status === "archived" ? "active" : "archived";
    await updateMutation.mutateAsync({ id: project.id, data: { status: newStatus } });
  };

  const handleCreateOrUpdateProject = async (data: { title: string; academicYear?: string; description?: string; status: "active" | "archived" | "draft" }) => {
    if (editProject) {
      await updateMutation.mutateAsync({ id: editProject.id, data: { title: data.title, description: data.description, status: data.status } });
      setEditProject(null);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const confirmDelete = async () => {
    if (deleteProject) {
      await deleteMutation.mutateAsync(deleteProject.id);
      setDeleteProject(null);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "م";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="وثّق" className="h-9 w-9 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-lg text-primary">وثّق</span>
              <span className="text-xs text-muted-foreground hidden sm:block">نظّم، ارفع، شارك… بكل سهولة</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={showQRGenerator ? "default" : "ghost"}
              onClick={() => setShowQRGenerator(!showQRGenerator)}
              className="gap-2"
              data-testid="button-qr-generator"
            >
              <QrCode className="h-5 w-5" />
              <span>مولد QR Code</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard/trash")}
              title="سلة المهملات"
              data-testid="button-trash"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(user?.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block max-w-32 truncate">
                    {user?.full_name || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setLocation("/profile")}
                  data-testid="menu-item-profile"
                >
                  <User className="h-4 w-4 ml-2" />
                  إعدادات الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={(e) => {
                    e.preventDefault();
                    signOut();
                  }}
                  data-testid="menu-item-signout"
                >
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DriveConnectionStatus />

        {showQRGenerator && (
          <div className="mb-8">
            <QRCodeGenerator compact />
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">مشاريعي</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              نظّم موادك التعليمية
              <span className="text-muted-foreground">•</span>
              <DriveConnectionBadge />
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-project">
            <Plus className="h-4 w-4 ml-2" />
            مشروع جديد
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث في المشاريع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
              data-testid="input-search-projects"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">الكل</TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">نشط</TabsTrigger>
              <TabsTrigger value="draft" data-testid="tab-draft">مسودة</TabsTrigger>
              <TabsTrigger value="archived" data-testid="tab-archived">مؤرشف</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-6 border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <LayoutGrid className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || statusFilter !== "all" ? "لا توجد مشاريع" : "لا توجد مشاريع بعد"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all" 
                ? "جرب تعديل البحث أو الفلاتر"
                : "أنشئ أول مشروع لك لبدء تنظيم الملفات"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء مشروع
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onShare={handleShareProject}
                onArchive={handleArchiveProject}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditProject(null);
        }}
        onSubmit={handleCreateOrUpdateProject}
        editProject={editProject}
      />

      <ShareDialog
        open={!!shareProject}
        onOpenChange={(open) => {
          if (!open) {
            setShareProject(null);
            setShareLink(null);
          }
        }}
        project={shareProject}
        shareLink={shareLink}
        onCreateLink={async (projectId) => {
          await createShareLinkMutation.mutateAsync({ projectId });
        }}
        onToggleLink={async (linkId, active) => {
          await toggleShareLinkMutation.mutateAsync({ linkId, active });
        }}
      />

      <AlertDialog open={!!deleteProject} onOpenChange={(open) => !open && setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>نقل المشروع إلى سلة المهملات</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من نقل "{deleteProject?.title}" إلى سلة المهملات؟ 
              سيتم أيضاً نقل جميع المجلدات والملفات إلى سلة المهملات في جوجل درايف.
              يمكنك استعادة المشروع لاحقاً من سلة المهملات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
            >
              نقل إلى السلة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
