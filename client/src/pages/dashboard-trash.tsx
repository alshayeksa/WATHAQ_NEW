import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import type { Project } from "@shared/schema";

export default function DashboardTrashPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);

  const { data: deletedProjects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects/deleted"],
  });

  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/deleted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "تم استعادة المشروع بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في استعادة المشروع", variant: "destructive" });
    },
  });

  const permanentDeleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects/deleted"] });
      toast({ title: "تم حذف المشروع نهائياً" });
    },
    onError: () => {
      toast({ title: "فشل في حذف المشروع", variant: "destructive" });
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
    deletedProjects.forEach(p => allIds.add(p.id));
    setSelectedItems(allIds);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleRestoreSelected = async () => {
    const items = Array.from(selectedItems);
    for (const id of items) {
      await restoreProjectMutation.mutateAsync(id);
    }
    setSelectedItems(new Set());
  };

  const handleDeleteSelectedPermanently = async () => {
    const items = Array.from(selectedItems);
    for (const id of items) {
      await permanentDeleteProjectMutation.mutateAsync(id);
    }
    setSelectedItems(new Set());
    setPermanentDeleteDialogOpen(false);
  };

  const handleEmptyTrash = async () => {
    for (const project of deletedProjects) {
      await permanentDeleteProjectMutation.mutateAsync(project.id);
    }
    setEmptyTrashDialogOpen(false);
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

  const totalItems = deletedProjects.length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trash2 className="h-6 w-6 text-muted-foreground" />
                <h1 className="text-xl font-bold">سلة المهملات</h1>
                <span className="text-sm text-muted-foreground">
                  - المشاريع المحذوفة
                </span>
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
                  تم تحديد {selectedItems.size} مشروع
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
                    disabled={restoreProjectMutation.isPending}
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
              {totalItems} مشروع في سلة المهملات
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
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : totalItems === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Trash2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">سلة المهملات فارغة</p>
              <p className="text-sm mt-2">
                عند حذف المشاريع، ستظهر هنا
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {deletedProjects.map(project => (
              <Card
                key={project.id}
                className={`hover-elevate ${
                  selectedItems.has(project.id) ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`card-trash-project-${project.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedItems.has(project.id)}
                      onCheckedChange={() => toggleSelect(project.id)}
                      data-testid={`checkbox-project-${project.id}`}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <FolderOpen className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          تم الحذف: {formatDate(project.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => restoreProjectMutation.mutate(project.id)}
                        disabled={restoreProjectMutation.isPending}
                        title="استعادة"
                        data-testid={`button-restore-project-${project.id}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => permanentDeleteProjectMutation.mutate(project.id)}
                        disabled={permanentDeleteProjectMutation.isPending}
                        title="حذف نهائياً"
                        data-testid={`button-delete-project-${project.id}`}
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
              سيتم حذف جميع المشاريع ({totalItems}) نهائياً من سلة المهملات وجوجل درايف.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={permanentDeleteProjectMutation.isPending}
              data-testid="button-confirm-empty-trash"
            >
              {permanentDeleteProjectMutation.isPending ? "جاري الحذف..." : "تفريغ السلة"}
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
              سيتم حذف {selectedItems.size} مشروع نهائياً من سلة المهملات وجوجل درايف.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelectedPermanently}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={permanentDeleteProjectMutation.isPending}
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
