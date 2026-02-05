import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen, 
  MoreVertical, 
  QrCode, 
  ExternalLink,
  Pencil,
  Trash2,
  Archive
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onShare: (project: Project) => void;
  onArchive: (project: Project) => void;
}

const statusLabels: Record<string, string> = {
  active: "نشط",
  archived: "مؤرشف",
  draft: "مسودة",
};

export function ProjectCard({ 
  project, 
  onOpen, 
  onEdit, 
  onDelete, 
  onShare,
  onArchive 
}: ProjectCardProps) {
  const statusColors = {
    active: "bg-primary/10 text-primary border-primary/20",
    archived: "bg-muted text-muted-foreground border-muted",
    draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  return (
    <Card className="hover-elevate group" data-testid={`card-project-${project.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate" data-testid={`text-project-title-${project.id}`}>
              {project.title}
            </h3>
            <Badge 
              variant="outline" 
              className={`text-xs ${statusColors[project.status]}`}
            >
              {statusLabels[project.status] || project.status}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`button-project-menu-${project.id}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Pencil className="h-4 w-4 ml-2" />
              تعديل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(project)}>
              <QrCode className="h-4 w-4 ml-2" />
              مشاركة / رمز QR
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(project)}>
              <Archive className="h-4 w-4 ml-2" />
              {project.status === "archived" ? "إلغاء الأرشفة" : "أرشفة"}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(project)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="pb-3">
        {project.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">
            لا يوجد وصف
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button 
          variant="secondary" 
          size="sm" 
          className="flex-1"
          onClick={() => onOpen(project)}
          data-testid={`button-open-project-${project.id}`}
        >
          <ExternalLink className="h-4 w-4 ml-2" />
          فتح
        </Button>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => onShare(project)}
          data-testid={`button-share-project-${project.id}`}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
