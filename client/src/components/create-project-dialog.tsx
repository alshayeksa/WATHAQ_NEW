import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Get current academic year (Hijri approximation)
function getCurrentAcademicYear(): string {
  const now = new Date();
  const gregorianYear = now.getFullYear();
  // Hijri year approximation (Gregorian year - 579 or 580)
  const hijriYear = gregorianYear - 579;
  return `${hijriYear}هـ / ${gregorianYear}م`;
}

const formSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(100, "العنوان طويل جداً"),
  academicYear: z.string().min(1, "السنة الدراسية مطلوبة").max(50, "السنة الدراسية طويلة جداً"),
  description: z.string().max(500, "الوصف طويل جداً").optional(),
  status: z.enum(["active", "draft"]),
});

type FormData = z.infer<typeof formSchema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => Promise<void>;
  editProject?: { title: string; description?: string | null; status: string } | null;
}

export function CreateProjectDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  editProject 
}: CreateProjectDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editProject?.title || "",
      academicYear: getCurrentAcademicYear(),
      description: editProject?.description || "",
      status: (editProject?.status as "active" | "draft") || "active",
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("فشل في حفظ المشروع:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editProject ? "تعديل المشروع" : "إنشاء مشروع جديد"}
          </DialogTitle>
          <DialogDescription>
            {editProject 
              ? "قم بتحديث تفاصيل مشروعك."
              : "أنشئ مشروعاً جديداً لتنظيم موادك التعليمية. سيتم إنشاء مجلد في جوجل درايف الخاص بك."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان المشروع</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="مثال: ملف إنجاز الرياضيات" 
                      data-testid="input-project-title"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="academicYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السنة الدراسية</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="مثال: 1447هـ / 2026م" 
                      data-testid="input-academic-year"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="وصف مختصر لمشروعك..."
                      className="resize-none"
                      rows={3}
                      data-testid="input-project-description"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-project-status">
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="draft">مسودة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                data-testid="button-save-project"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {editProject ? "حفظ التغييرات" : "إنشاء المشروع"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
