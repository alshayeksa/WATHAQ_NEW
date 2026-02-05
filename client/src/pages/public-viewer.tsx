import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Folder, 
  File, 
  FolderOpen,
  ChevronLeft,
  Home,
  ArrowRight,
  Lock,
  Image,
  FileText,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  ExternalLink,
  Eye,
  School,
  MapPin,
  Briefcase
} from "lucide-react";
import type { PublicProjectView } from "@shared/schema";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType === "application/pdf") return FileText;
  return File;
}

export default function PublicViewer() {
  const { slug } = useParams<{ slug: string }>();
  const [pin, setPin] = useState("");
  const [enteredPin, setEnteredPin] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<PublicProjectView & { needsPin?: boolean }>({
    queryKey: ["/api/public", slug, enteredPin],
    queryFn: async () => {
      const url = enteredPin 
        ? `/api/public/${slug}?pin=${enteredPin}`
        : `/api/public/${slug}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401 && data.needsPin) {
          return { needsPin: true } as any;
        }
        throw new Error(data.error || "Failed to load project");
      }
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  const handleSubmitPin = () => {
    if (pin.length >= 4) {
      setEnteredPin(pin);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">المشروع غير موجود</h1>
          <p className="text-muted-foreground">
            هذا المشروع غير موجود أو انتهت صلاحية رابط المشاركة.
          </p>
        </div>
      </div>
    );
  }

  if (data?.needsPin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-sm mx-4">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold mb-2">مطلوب رمز PIN</h1>
              <p className="text-sm text-muted-foreground">
                أدخل رمز PIN لعرض هذا المشروع.
              </p>
            </div>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="أدخل رمز PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitPin()}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                data-testid="input-public-pin"
              />
              <Button 
                onClick={handleSubmitPin}
                disabled={pin.length < 4}
                className="w-full"
                data-testid="button-submit-pin"
              >
                <Eye className="h-4 w-4 ml-2" />
                عرض المشروع
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !data.title) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">المشروع غير موجود</h1>
          <p className="text-muted-foreground">
            هذا المشروع غير موجود أو انتهت صلاحية رابط المشاركة.
          </p>
        </div>
      </div>
    );
  }

  const currentFolder = currentFolderId 
    ? data.folders.find(f => f.id === currentFolderId)
    : null;

  const currentFiles = currentFolder?.files || 
    (currentFolderId === null ? data.folders.find(f => !f.id)?.files || [] : []);

  const subFolders = data.folders.filter(f => f.id !== currentFolderId);

  const teacher = data.teacher;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg" data-testid="text-public-title">
                {data.title}
              </h1>
              <Badge variant="secondary" className="text-xs">
                عرض للقراءة فقط
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {teacher && (teacher.full_name || teacher.school_name || teacher.specialization) && (
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4">
            <Card className="bg-card/80">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {teacher.full_name && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">{teacher.full_name}</span>
                      {teacher.job_title && (
                        <span className="text-muted-foreground">- {teacher.job_title}</span>
                      )}
                    </div>
                  )}
                  {teacher.school_name && (
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4 text-primary" />
                      <span>{teacher.school_name}</span>
                    </div>
                  )}
                  {teacher.specialization && (
                    <Badge variant="outline">{teacher.specialization}</Badge>
                  )}
                  {(teacher.city || teacher.region) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {[teacher.city, teacher.region].filter(Boolean).join("، ")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">

        <div className="flex items-center gap-2 text-sm mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(null)}
            className="gap-1"
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </Button>
          {currentFolder && (
            <>
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="font-medium"
              >
                {currentFolder.folder_name}
              </Button>
            </>
          )}
        </div>

        {currentFolderId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolderId(null)}
            className="gap-2 text-muted-foreground mb-4"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
        )}

        {data.folders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Folder className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">لا توجد ملفات بعد</h3>
            <p className="text-sm text-muted-foreground">
              لم يقم المعلم بإضافة أي ملفات إلى هذا المشروع بعد.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {!currentFolderId && data.folders.map((folder) => (
              <Card 
                key={folder.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => setCurrentFolderId(folder.id)}
                data-testid={`card-public-folder-${folder.id}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Folder className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium truncate">
                    {folder.folder_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {folder.files.length} ملف{folder.files.length !== 1 ? "ات" : ""}
                  </p>
                </CardContent>
              </Card>
            ))}

            {currentFolder?.files.map((file, index) => {
              const FileIcon = getFileIcon(file.mime_type);
              return (
                <Card 
                  key={index}
                  className="hover-elevate"
                  data-testid={`card-public-file-${index}`}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium truncate mb-2" title={file.file_name}>
                      {file.file_name}
                    </p>
                    {file.web_view_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.web_view_link!, "_blank")}
                        className="w-full"
                      >
                        <ExternalLink className="h-3 w-3 ml-1" />
                        عرض
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          مدعوم من ملفات المعلم
        </div>
      </footer>
    </div>
  );
}
