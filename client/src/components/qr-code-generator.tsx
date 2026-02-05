import { useState, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { QrCode, Download, Palette, ImageIcon, Share2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import moeLogo from "@assets/moe_logo.png";

const COLOR_PALETTES = [
  { name: "أسود", fg: "#000000", bg: "#FFFFFF" },
  { name: "أزرق", fg: "#1E40AF", bg: "#FFFFFF" },
  { name: "أخضر", fg: "#166534", bg: "#FFFFFF" },
  { name: "أحمر", fg: "#DC2626", bg: "#FFFFFF" },
  { name: "بنفسجي", fg: "#7C3AED", bg: "#FFFFFF" },
  { name: "رمادي", fg: "#374151", bg: "#F3F4F6" },
];

interface QRCodeGeneratorProps {
  id?: string;
  compact?: boolean;
}

export function QRCodeGenerator({ id, compact = false }: QRCodeGeneratorProps) {
  const [url, setUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTES[0]);
  const [showLogo, setShowLogo] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(() => {
    if (url.trim()) {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }
      setGeneratedUrl(finalUrl);
    }
  }, [url]);

  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      const link = document.createElement("a");
      link.download = "qrcode.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  }, []);

  const handleShareWhatsApp = useCallback(async () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        if (navigator.share && navigator.canShare) {
          const file = new File([blob], "qrcode.png", { type: "image/png" });
          const shareData = {
            files: [file],
            title: "QR Code",
            text: `QR Code للرابط: ${generatedUrl}`,
          };

          if (navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              return;
            } catch (err) {
              console.log("Share cancelled or failed, falling back to WhatsApp link");
            }
          }
        }

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`تم إنشاء QR Code للرابط: ${generatedUrl}`)}`;
        window.open(whatsappUrl, "_blank");
      }, "image/png");
    } catch (error) {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`تم إنشاء QR Code للرابط: ${generatedUrl}`)}`;
      window.open(whatsappUrl, "_blank");
    }
  }, [generatedUrl]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGenerate();
    }
  }, [handleGenerate]);

  return (
    <section id={id} className={compact ? "py-8" : "py-20 bg-muted/30"}>
      <div className={compact ? "" : "container mx-auto px-4"}>
        {!compact && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <QrCode className="h-4 w-4" />
              <span>خدمة مجانية</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              خدمة تحويل الروابط إلى QR Code
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              هذه الخدمة عامة ومجانية لجميع الزوار
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-lg">أدخل الرابط المراد تحويله</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-[200px] text-left"
                  dir="ltr"
                  data-testid="input-qr-url"
                />
                <Button 
                  onClick={handleGenerate} 
                  disabled={!url.trim()}
                  data-testid="button-generate-qr"
                >
                  <QrCode className="ml-2 h-4 w-4" />
                  إنشاء QR Code
                </Button>
              </div>

              {generatedUrl && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div 
                    ref={qrRef} 
                    className="flex justify-center p-6 rounded-lg border"
                    style={{ backgroundColor: selectedColor.bg }}
                    data-testid="qr-code-display"
                  >
                    <QRCodeCanvas
                      value={generatedUrl}
                      size={256}
                      level="H"
                      fgColor={selectedColor.fg}
                      bgColor={selectedColor.bg}
                      imageSettings={showLogo ? {
                        src: moeLogo,
                        x: undefined,
                        y: undefined,
                        height: 50,
                        width: 50,
                        excavate: true,
                      } : undefined}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Palette className="h-4 w-4" />
                        <span>اختر اللون</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PALETTES.map((color, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedColor(color)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                              selectedColor === color
                                ? "border-primary bg-primary/10"
                                : "border-border hover-elevate"
                            }`}
                            data-testid={`button-color-${color.name}`}
                          >
                            <div
                              className="w-5 h-5 rounded-full border"
                              style={{ backgroundColor: color.fg }}
                            />
                            <span className="text-sm">{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Checkbox
                        id="showLogo"
                        checked={showLogo}
                        onCheckedChange={(checked) => setShowLogo(checked === true)}
                        data-testid="checkbox-show-logo"
                      />
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="showLogo" className="cursor-pointer">
                          إضافة شعار وزارة التعليم في المنتصف
                        </Label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button 
                        onClick={handleDownload} 
                        className="flex-1 min-w-[150px]"
                        size="lg"
                        data-testid="button-download-qr"
                      >
                        <Download className="ml-2 h-5 w-5" />
                        تنزيل QR Code
                      </Button>
                      <Button 
                        onClick={handleShareWhatsApp} 
                        className="flex-1 min-w-[150px] bg-[#25D366] hover:bg-[#128C7E] text-white"
                        size="lg"
                        data-testid="button-share-whatsapp"
                      >
                        <SiWhatsapp className="ml-2 h-5 w-5" />
                        مشاركة عبر واتساب
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
