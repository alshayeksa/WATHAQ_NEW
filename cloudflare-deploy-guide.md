# دليل نشر التطبيق على Cloudflare Pages

## نظرة عامة

هذا التطبيق يتكون من جزأين:
- **Frontend (React)** - يمكن نشره على Cloudflare Pages
- **Backend (Express API)** - يجب نشره على Render أو خدمة مشابهة

**ملاحظة:** Cloudflare Workers لا يدعم Express.js بشكل كامل، لذلك نستخدم Cloudflare Pages للـ Frontend فقط.

---

## الخطوة 1: نشر Backend على Render

### 1.1 إنشاء Web Service
1. اذهب إلى [Render Dashboard](https://dashboard.render.com/)
2. اضغط **New** → **Web Service**
3. اربط مستودعك من GitHub

### 1.2 إعدادات البناء
- **Name:** `waththaq-api`
- **Environment:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

### 1.3 متغيرات البيئة (Environment Variables)

| المتغير | الوصف | مثال |
|---------|-------|------|
| `SUPABASE_URL` | رابط مشروع Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخدمة (ليس Anon!) | `eyJhbGci...` |
| `SUPABASE_ANON_KEY` | المفتاح العام | `eyJhbGci...` |
| `GOOGLE_CLIENT_ID` | معرف OAuth من Google | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | سر OAuth من Google | `GOCSPX-xxx` |
| `SESSION_SECRET` | مفتاح تشفير الجلسات | `random-32-char-string` |
| `FRONTEND_URL` | رابط Frontend على Cloudflare | `https://waththaq.pages.dev` |
| `NODE_ENV` | بيئة التشغيل | `production` |

### 1.4 احفظ رابط Render
بعد النشر، ستحصل على رابط مثل: `https://waththaq-api.onrender.com`

---

## الخطوة 2: نشر Frontend على Cloudflare Pages

### 2.1 إنشاء مشروع Pages
1. اذهب إلى [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. اختر **Pages** من القائمة الجانبية
3. اضغط **Create a project** → **Connect to Git**
4. اختر مستودعك من GitHub

### 2.2 إعدادات البناء
- **Project name:** `waththaq`
- **Production branch:** `main`
- **Build command:** `npm run build`
- **Build output directory:** `dist/public`
- **Root directory:** `/` (اتركه فارغ)

### 2.3 متغيرات البيئة

| المتغير | الوصف | مثال |
|---------|-------|------|
| `VITE_SUPABASE_URL` | رابط Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام | `eyJhbGci...` |
| `VITE_API_URL` | رابط Backend على Render | `https://waththaq-api.onrender.com` |

**مهم:** لا تضع شرطة مائلة `/` في نهاية `VITE_API_URL`

---

## الخطوة 3: تحديث إعدادات Supabase

### 3.1 في Authentication → URL Configuration

**Site URL:**
```
https://waththaq.pages.dev
```

**Redirect URLs:**
```
https://waththaq.pages.dev/auth/callback
https://waththaq.pages.dev
```

### 3.2 تطبيق سياسات RLS (اختياري)

إذا أردت تفعيل RLS مع الحفاظ على عمل التطبيق:
1. افتح Supabase SQL Editor
2. انسخ محتوى ملف `supabase_rls_policies.sql`
3. شغّل الأوامر

**ملاحظة:** Backend يستخدم `SERVICE_ROLE_KEY` الذي يتجاوز RLS تلقائياً.

---

## الخطوة 4: تحديث Google OAuth

في [Google Cloud Console](https://console.cloud.google.com/):

### Authorized JavaScript origins:
```
https://waththaq.pages.dev
https://waththaq-api.onrender.com
```

### Authorized redirect URIs:
```
https://[your-supabase-project].supabase.co/auth/v1/callback
```

---

## التحقق من النشر

### قائمة التحقق
- [ ] Backend يعمل على Render (تحقق من `/api/health` أو الصفحة الرئيسية)
- [ ] Frontend يعمل على Cloudflare Pages
- [ ] تسجيل الدخول بـ Google يعمل
- [ ] Google Drive متصل
- [ ] المشاريع تظهر في لوحة التحكم

### حل المشاكل الشائعة

#### خطأ CORS
- تأكد من `FRONTEND_URL` في Render يطابق رابط Cloudflare
- أعد تشغيل Backend بعد تعديل المتغيرات

#### API غير موجود (404)
- تأكد من `VITE_API_URL` صحيح (بدون شرطة مائلة في النهاية)
- تأكد من إعادة بناء Frontend بعد تعديل المتغيرات

#### تسجيل الدخول لا يعمل
- تحقق من Supabase Redirect URLs
- تحقق من Google OAuth settings

---

## البديل الأسهل: Replit Deployments

إذا أردت حلاً أبسط بدون إعداد خوادم منفصلة:

1. في Replit، اضغط زر **Deploy**
2. اتبع التعليمات
3. ستحصل على رابط واحد يعمل مباشرة

Replit Deployments يتعامل مع Frontend و Backend معاً تلقائياً.
