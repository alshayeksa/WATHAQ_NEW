import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">سياسة الخصوصية Privacy policy</span>
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
                سياسة الخصوصية لمنصة "منظم المعلم"
              </h1>
              <p className="text-muted-foreground">
                تعد خصوصية بياناتكم وحماية ملفاتكم على Google Drive أولوية قصوى لنا. توضح هذه السياسة كيف يتعامل تطبيقنا مع بياناتكم.
              </p>
            </div>

            <div className="space-y-8" dir="rtl">
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
                  ما هي البيانات التي نجمعها؟ (What data do we collect?)
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <ul className="list-disc pr-6 space-y-2">
                    <li>
                      <strong className="text-foreground">بيانات البروفايل:</strong> الاسم، البريد الإلكتروني، وصورة الحساب من جوجل (Profile Info: Name, email, and avatar from your Google Account).
                    </li>
                    <li>
                      <strong className="text-foreground">بيانات درايف:</strong> نحن "نرى" فقط الملفات والمجلدات التي تم إنشاؤها عبر تطبيقنا لنعرض لك محتواها. نحن لا نقوم بقراءة محتوى مستنداتك الخاصة (Drive Metadata: We only "see" the files and folders created through our app to display them to you. We do not read the content of your private documents).
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
                  كيف نستخدم ملفاتكم على Google Drive؟
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>تطبيقنا يتبع سياسة "الوصول المحدود"، مما يعني:</p>
                  <ul className="list-disc pr-6 space-y-2">
                    <li>
                      <strong className="text-foreground">صلاحية drive.file:</strong> التطبيق لا يستطيع رؤية أو تعديل أو حذف أي ملفات في حسابك إلا الملفات والمجلدات التي تم إنشاؤها بواسطة التطبيق نفسه.
                    </li>
                    <li>
                      <strong className="text-foreground">الغرض:</strong> نستخدم الصلاحية فقط لإنشاء هيكل المجلدات (المشاريع) ورفع ملفات التحضير والوثائق التي تختارها أنت.
                    </li>
                    <li>
                      <strong className="text-foreground">الخصوصية:</strong> نحن لا نقوم بتخزين نسخ من ملفاتك على خوادمنا الخاصة؛ ملفاتك تبقى بأمان داخل بيئة Google Drive الخاصة بك.
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
                  مشاركة البيانات
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <ul className="list-disc pr-6 space-y-2">
                    <li>
                      <strong className="text-foreground">عدم البيع:</strong> نحن لا نبيع أو نؤجر بياناتك الشخصية لأي جهة خارجية تحت أي ظرف.
                    </li>
                    <li>
                      <strong className="text-foreground">روابط المشاركة:</strong> أنت الوحيد المسؤول عن مشاركة روابط الـ QR. المعلومات التي تظهر للمشرفين عبر هذه الروابط هي فقط الملفات التي اخترت وضعها في المجلدات المخصصة للمشاركة.
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span>
                  أمن البيانات
                </h2>
                <div className="pr-10 text-muted-foreground">
                  <p>
                    نحن نستخدم تقنيات تشفير متطورة لحماية "رموز الوصول" الخاصة بك، لضمان عدم وصول أي طرف غير مصرح له إليها.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">5</span>
                  التحكم في البيانات
                </h2>
                <div className="pr-10 space-y-3 text-muted-foreground">
                  <p>يمكنك في أي وقت:</p>
                  <ul className="list-disc pr-6 space-y-2">
                    <li>حذف مشاريعك من داخل التطبيق.</li>
                    <li>إلغاء صلاحية وصول التطبيق تماماً عبر إعدادات "الأمان" في حسابك على جوجل.</li>
                    <li>طلب حذف حسابك بالكامل من منصتنا وسنقوم بمسح كافة بياناتك فوراً.</li>
                  </ul>
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
