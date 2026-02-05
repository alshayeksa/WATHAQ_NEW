import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 - الصفحة غير موجودة</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground mb-6">
            الصفحة التي تبحث عنها غير موجودة.
          </p>
          
          <Button onClick={() => setLocation("/")} data-testid="button-go-home">
            <Home className="h-4 w-4 ml-2" />
            العودة للرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
