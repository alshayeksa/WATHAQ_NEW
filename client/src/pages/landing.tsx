import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { 
  FolderOpen, 
  Share2, 
  QrCode, 
  Shield, 
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Cloud
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useEffect } from "react";
import { QRCodeGenerator } from "@/components/qr-code-generator";
import appLogo from "@/assets/logo.png";

export default function Landing() {
  const { user, signIn, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !loading) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  const features = [
    {
      icon: FolderOpen,
      title: "تنظيم الملفات بسهولة",
      description: "أنشئ مشاريع ونظم موادك التعليمية في هيكل مجلدات متزامن مع جوجل درايف.",
    },
    {
      icon: Cloud,
      title: "التكامل مع جوجل درايف",
      description: "جميع ملفاتك مخزنة بأمان في حسابك الخاص على جوجل درايف. يمكنك الوصول إليها من أي مكان.",
    },
    {
      icon: QrCode,
      title: "مشاركة رمز QR",
      description: "أنشئ رموز QR فريدة لكل مشروع. يمكن للمشرفين مسحها وعرض الملفات فوراً.",
    },
    {
      icon: Shield,
      title: "التحكم الآمن بالوصول",
      description: "تحكم بمن يرى ملفاتك باستخدام روابط محمية برمز PIN وإعدادات انتهاء الصلاحية.",
    },
  ];

  const benefits = [
    "لا مزيد من مرفقات البريد الإلكتروني أو ذاكرة USB",
    "عرض احترافي للمشرفين",
    "مزامنة فورية مع جوجل درايف",
    "يعمل على أي جهاز يحتوي على متصفح",
    "مجاني للاستخدام مع حسابك على جوجل",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="وثّق" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-xl text-primary">وثّق</span>
              <span className="text-xs text-muted-foreground hidden sm:block">نظّم، ارفع، شارك… بكل سهولة</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="#qr-generator" 
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-qr-generator"
            >
              <QrCode className="h-4 w-4" />
              <span>مولد QR Code</span>
            </a>
            <Button 
              onClick={signIn} 
              disabled={loading}
              data-testid="button-signin-header"
            >
              <SiGoogle className="ml-2 h-4 w-4" />
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>مصمم للمعلمين</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
              نظّم وشارك موادك التعليمية{" "}
              <span className="text-primary">بسهولة</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              أداة بسيطة وقوية للمعلمين لتنظيم الملفات في جوجل درايف 
              ومشاركتها مع المشرفين عبر رموز QR. لا مزيد من عناء مشاركة الملفات.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={signIn}
                disabled={loading}
                className="text-base px-8"
                data-testid="button-get-started"
              >
                <SiGoogle className="ml-2 h-5 w-5" />
                ابدأ مجاناً
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                كل ما تحتاجه
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                ميزات بسيطة وقوية مصممة خصيصاً للمعلمين والمربين.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="qr-generator" className="py-12">
          <div className="container mx-auto px-4">
            <div className="relative rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8 shadow-lg">
              <div className="absolute -top-4 right-8 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                خدمة مجانية
              </div>
              <QRCodeGenerator compact={false} />
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  لماذا يحب المعلمون وثّق
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  مصمم مع وضع المعلمين في الاعتبار، يبسط وثّق 
                  عملية تنظيم ومشاركة الملفات بالكامل، مما يوفر وقتك ويقلل من التوتر.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    <div className="aspect-square rounded-xl bg-card border flex items-center justify-center">
                      <FolderOpen className="h-12 w-12 text-primary/60" />
                    </div>
                    <div className="aspect-square rounded-xl bg-card border flex items-center justify-center">
                      <Share2 className="h-12 w-12 text-primary/60" />
                    </div>
                    <div className="aspect-square rounded-xl bg-card border flex items-center justify-center">
                      <QrCode className="h-12 w-12 text-primary/60" />
                    </div>
                    <div className="aspect-square rounded-xl bg-card border flex items-center justify-center">
                      <Shield className="h-12 w-12 text-primary/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              هل أنت مستعد للتنظيم؟
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              انضم إلى آلاف المعلمين الذين يستخدمون بالفعل ملفات المعلم 
              لتبسيط إدارة ملفاتهم.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={signIn}
              disabled={loading}
              className="text-base px-8"
              data-testid="button-cta-bottom"
            >
              <SiGoogle className="ml-2 h-5 w-5" />
              ابدأ مجاناً
              <ArrowLeft className="mr-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm space-y-4">
          <p>وثّق - نظّم، ارفع، شارك… بكل سهولة</p>
          <div className="flex justify-center gap-6">
            <a 
              href="/terms" 
              className="text-primary hover:underline"
              data-testid="link-terms-of-service"
            >
              Terms of Service شروط الخدمة
            </a>
            <a 
              href="/privacy" 
              className="text-primary hover:underline"
              data-testid="link-privacy-policy"
            >
              سياسة الخصوصية Privacy policy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
