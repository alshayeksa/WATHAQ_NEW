-- =============================================
-- سياسات RLS لتطبيق وثّق (Waththaq)
-- =============================================
-- تشغيل هذا الملف في Supabase SQL Editor
-- =============================================

-- 1. تفعيل RLS على جميع الجداول
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. حذف جميع السياسات الموجودة لتجنب التعارض
DROP POLICY IF EXISTS "service_role_all_profiles" ON profiles;
DROP POLICY IF EXISTS "service_role_all_drive_connections" ON drive_connections;
DROP POLICY IF EXISTS "service_role_all_projects" ON projects;
DROP POLICY IF EXISTS "service_role_all_folders" ON folders;
DROP POLICY IF EXISTS "service_role_all_files_metadata" ON files_metadata;
DROP POLICY IF EXISTS "service_role_all_share_links" ON share_links;
DROP POLICY IF EXISTS "service_role_all_audit_logs" ON audit_logs;

DROP POLICY IF EXISTS "user_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "user_manage_own_projects" ON projects;
DROP POLICY IF EXISTS "user_manage_own_folders" ON folders;
DROP POLICY IF EXISTS "user_manage_own_files" ON files_metadata;

DROP POLICY IF EXISTS "public_read_share_links" ON share_links;
DROP POLICY IF EXISTS "public_read_shared_projects" ON projects;
DROP POLICY IF EXISTS "public_read_shared_folders" ON folders;
DROP POLICY IF EXISTS "public_read_shared_files" ON files_metadata;
DROP POLICY IF EXISTS "public_read_teacher_info" ON profiles;

-- 3. سياسات Service Role (للـ Backend - تتجاوز RLS)
CREATE POLICY "service_role_all_profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_drive_connections" ON drive_connections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_projects" ON projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_folders" ON folders FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_files_metadata" ON files_metadata FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_share_links" ON share_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_audit_logs" ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- 4. سياسات المستخدمين (للـ Frontend)
-- الملفات الشخصية: المستخدم يقرأ/يعدل ملفه الشخصي فقط
CREATE POLICY "user_read_own_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "user_update_own_profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- المشاريع: المستخدم يدير مشاريعه فقط
CREATE POLICY "user_manage_own_projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- المجلدات: المستخدم يدير مجلدات مشاريعه فقط
CREATE POLICY "user_manage_own_folders" ON folders FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = folders.project_id AND projects.user_id = auth.uid())
);

-- الملفات: المستخدم يدير ملفات مشاريعه فقط
CREATE POLICY "user_manage_own_files" ON files_metadata FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = files_metadata.project_id AND projects.user_id = auth.uid())
);

-- 5. سياسات الوصول العام (للمشرفين عبر روابط المشاركة)
-- روابط المشاركة: السماح بالبحث عن الروابط المفعلة
CREATE POLICY "public_read_share_links" ON share_links FOR SELECT USING (is_enabled = true);

-- المشاريع: السماح بالقراءة إذا كانت مشتركة
CREATE POLICY "public_read_shared_projects" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM share_links WHERE share_links.project_id = projects.id AND share_links.is_enabled = true)
);

-- المجلدات: السماح بالقراءة إذا كان المشروع مشتركاً
CREATE POLICY "public_read_shared_folders" ON folders FOR SELECT USING (
  EXISTS (SELECT 1 FROM share_links WHERE share_links.project_id = folders.project_id AND share_links.is_enabled = true)
);

-- الملفات: السماح بالقراءة إذا كان المشروع مشتركاً
CREATE POLICY "public_read_shared_files" ON files_metadata FOR SELECT USING (
  EXISTS (SELECT 1 FROM share_links WHERE share_links.project_id = files_metadata.project_id AND share_links.is_enabled = true)
);

-- معلومات المعلم: السماح بالقراءة للمشاريع المشتركة
CREATE POLICY "public_read_teacher_info" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects 
    JOIN share_links ON share_links.project_id = projects.id 
    WHERE projects.user_id = profiles.id AND share_links.is_enabled = true
  )
);

-- =============================================
-- انتهى! 
-- =============================================
