import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Terms of Service شروط الخدمة</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للرئيسية
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-4">
                شروط الخدمة لمنصة "منظم المعلم"
              </h1>
              <p className="text-muted-foreground">
                يرجى قراءة هذه الشروط بعناية قبل استخدام الخدمة.
              </p>
            </div>

            <div className="space-y-8" dir="rtl">
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
                  مقدمة (Introduction)
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>مرحباً بكم في [منظم المعلم]. باستخدامك لخدمتنا، فإنك توافق على هذه الشروط. يرجى قراءتها بعناية.</p>
                  <p className="text-sm">Welcome to [اسم تطبيقك - منظم المعلم]. By using our service, you agree to these terms. Please read them carefully.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
                  التكامل مع جوجل درايف (Google Drive Integration)
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>يعمل تطبيقنا كواجهة لمساعدتك في تنظيم ملفاتك على Google Drive. نحن لا نملك ملفاتك، ولا نملك حق الوصول إليها إلا من خلال الإجراءات المحددة التي تقوم بها (الرفع، إنشاء المجلدات، أو الحذف إلى سلة المهملات).</p>
                  <p className="text-sm">Our app acts as an interface to help you organize your files on Google Drive. We do not own your files, and we do not have access to them except for the specific actions you perform (uploading, creating folders, or deleting to trash).</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
                  الاحتفاظ بالبيانات وحذفها (Data Retention & Deletion)
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>الملفات المحذوفة تُنقل إلى سلة مهملات Google Drive وتخضع لسياسة الحذف الخاصة بجوجل (30 يوماً).</p>
                  <p>يقوم نظامنا بتخزين البيانات الوصفية (أسماء الملفات، معرفات المجلدات) لتقديم الخدمة. عند حذف حسابك، سيتم إزالة هذه البيانات.</p>
                  <p className="text-sm italic">Deleted files are moved to the Google Drive Trash and are subject to Google's 30-day deletion policy. Our system stores metadata (file names, folder IDs) to provide the service. If you delete your account, this metadata will be removed.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span>
                  مسؤوليات المستخدم (User Responsibilities)
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>أنت مسؤول عن المحتوى الذي تقوم برفعه. يجب عدم استخدام الخدمة في أي أنشطة غير قانونية أو لتخزين برامج ضارة.</p>
                  <p className="text-sm">You are responsible for the content you upload. You must not use the service for any illegal activities or to store malicious software.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">5</span>
                  إخلاء المسؤولية (Limitation of Liability)
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>نحن غير مسؤولين عن أي فقدان للبيانات يحدث على خوادم جوجل أو بسبب خطأ المستخدم (مثل الحذف النهائي للملفات).</p>
                  <p className="text-sm">We are not responsible for any data loss occurring on Google's servers or due to user error (e.g., permanent deletion of files).</p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            data-testid="button-return-home"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ملفات المعلم - نظّم، شارك، وبسّط</p>
        </div>
      </footer>
    </div>
  );
}
