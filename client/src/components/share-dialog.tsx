import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Download, ExternalLink, Loader2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Project, ShareLink } from "@shared/schema";

interface ShareLinkWithActive extends ShareLink {
  is_active?: boolean;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  shareLink: ShareLinkWithActive | null;
  onCreateLink: (projectId: string) => Promise<void>;
  onToggleLink: (linkId: string, active: boolean) => Promise<void>;
}

export function ShareDialog({ 
  open, 
  onOpenChange, 
  project,
  shareLink,
  onCreateLink,
  onToggleLink
}: ShareDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const shareUrl = shareLink 
    ? `${window.location.origin}/s/${shareLink.slug}`
    : "";

  const isLinkActive = shareLink?.is_active ?? shareLink?.is_enabled ?? false;

  useEffect(() => {
    if (shareUrl && isLinkActive) {
      QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#059669",
          light: "#ffffff",
        },
      }).then(setQrDataUrl);
    } else {
      setQrDataUrl("");
    }
  }, [shareUrl, isLinkActive]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `${project?.title || "مشروع"}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const shareToWhatsApp = async () => {
    if (!qrDataUrl || !shareUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${project?.title || "مشروع"}-qr.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare) {
        const shareData = {
          files: [file],
          title: `مشروع: ${project?.title}`,
          text: `رابط المشروع: ${shareUrl}`,
        };

        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return;
          } catch (err) {
            console.log("Share cancelled or failed");
          }
        }
      }

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`مشروع: ${project?.title}\nرابط المشروع: ${shareUrl}`)}`;
      window.open(whatsappUrl, "_blank");
    } catch (error) {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`مشروع: ${project?.title}\nرابط المشروع: ${shareUrl}`)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleCreateLink = async () => {
    if (!project) return;
    setIsCreating(true);
    try {
      await onCreateLink(project.id);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (active: boolean) => {
    if (!shareLink) return;
    await onToggleLink(shareLink.id, active);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>مشاركة المشروع</DialogTitle>
          <DialogDescription>
            {project?.title} - أنشئ رمز QR للمشرفين لعرض ملفاتك.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shareLink ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">رابط المشاركة</span>
                  <Badge variant={isLinkActive ? "default" : "secondary"}>
                    {isLinkActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
                <Switch
                  checked={isLinkActive}
                  onCheckedChange={handleToggle}
                  data-testid="switch-link-active"
                />
              </div>

              {isLinkActive && (
                <>
                  <div className="flex gap-2">
                    <Input 
                      value={shareUrl} 
                      readOnly 
                      className="font-mono text-sm"
                      data-testid="input-share-url"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copyToClipboard}
                      data-testid="button-copy-link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => window.open(shareUrl, "_blank")}
                      data-testid="button-preview-link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator />

                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-lg border">
                        <img 
                          src={qrDataUrl} 
                          alt="رمز QR" 
                          className="w-48 h-48"
                          data-testid="img-qr-code"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          onClick={downloadQR}
                          data-testid="button-download-qr"
                        >
                          <Download className="h-4 w-4 ml-2" />
                          تحميل رمز QR
                        </Button>
                        <Button 
                          onClick={shareToWhatsApp}
                          className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                          data-testid="button-share-whatsapp"
                        >
                          <SiWhatsapp className="h-4 w-4 ml-2" />
                          مشاركة عبر واتساب
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                جاري تحميل رابط المشاركة...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
