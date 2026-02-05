# ملفات المعلم (Teacher File Organizer)

تطبيق SaaS للمعلمين لتنظيم المواد التعليمية في جوجل درايف ومشاركتها مع المشرفين عبر رموز QR.

## Overview

TeacherFiles allows teachers to:
- Sign in with Google and connect their Google Drive
- Create projects to organize teaching materials
- Create folders and upload files (synced to Google Drive)
- Generate QR codes for sharing with supervisors
- Public viewer for supervisors to view files without logging in

## Architecture

### Frontend (React + Vite)
- **Language**: Arabic (العربية) with full RTL support
- **Font**: Tajawal (Google Fonts) for Arabic text rendering
- **Theme**: Emerald green color scheme
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Auth**: Supabase Auth with Google OAuth
- **Routing**: Wouter

### RTL Implementation
- HTML element has `lang="ar"` and `dir="rtl"` attributes
- Tailwind CSS automatically handles RTL layout
- Icons adjusted for RTL: ArrowRight for back navigation, ArrowLeft for forward
- ChevronLeft used for breadcrumb separators
- Dropdowns aligned to "start" for RTL compatibility

### Backend (Hono)
- **Framework**: Hono (lightweight, Cloudflare Workers compatible)
- **API Routes**: RESTful endpoints in `/api` (server/app.ts)
- **Database**: Supabase PostgreSQL with RLS
- **Repository Layer**: `server/repositories/` for CRUD operations
- **Google Drive**: Integration for folder/file operations
- **File Upload**: Native Hono multipart parsing
- **Deployment**: Cloudflare Workers (server/worker.ts) or Node.js (server/index.ts)

### Database Schema (Supabase PostgreSQL)
- **profiles**: User profile data (linked 1:1 with auth.users)
- **drive_connections**: Google Drive OAuth tokens (encrypted)
- **projects**: Main portfolio containers for teachers
- **folders**: Hierarchical folder tree inside projects
- **files_metadata**: Cached Google Drive file metadata
- **share_links**: QR code sharing settings
- **audit_logs**: Activity tracking

### Key Files
- `client/src/App.tsx` - Main app with routing
- `client/src/contexts/auth-context.tsx` - Auth state management
- `client/src/pages/` - Page components
- `server/app.ts` - Hono API routes and middleware
- `server/index.ts` - Node.js entry point (development/Replit)
- `server/worker.ts` - Cloudflare Workers entry point
- `server/repositories/` - Database CRUD operations
- `server/google-drive.ts` - Google Drive API integration
- `shared/schema.ts` - TypeScript types and Zod schemas

## Environment Variables

### Required Secrets
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon/public key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### Frontend Environment (VITE_)
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY` - Same as SUPABASE_ANON_KEY

## Supabase Setup Notes

The user needs to:
1. Enable Google Auth provider in Supabase Dashboard
2. Add Google OAuth credentials (Client ID & Secret)
3. Add the scope `https://www.googleapis.com/auth/drive.file`
4. Set the redirect URL in Google Cloud Console to: `https://[supabase-project].supabase.co/auth/v1/callback`

## API Routes

### Projects
- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project with folders/files
- `GET /api/projects/deleted` - List deleted projects
- `POST /api/projects` - Create project (creates Drive folder)
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Soft delete project (move to trash)
- `POST /api/projects/:id/restore` - Restore project from trash
- `DELETE /api/projects/:id/permanent` - Permanently delete project

### Folders
- `POST /api/projects/:id/folders` - Create folder
- `DELETE /api/folders/:id` - Soft delete folder (move to trash)
- `POST /api/folders/:id/restore` - Restore folder from trash
- `DELETE /api/folders/:id/permanent` - Permanently delete folder

### Files
- `POST /api/projects/:id/files` - Upload files (multipart)
- `DELETE /api/files/:id` - Soft delete file (move to trash)
- `POST /api/files/:id/restore` - Restore file from trash
- `DELETE /api/files/:id/permanent` - Permanently delete file

### Trash
- `GET /api/projects/:id/trash` - Get deleted files/folders in project
- `DELETE /api/projects/:id/trash` - Empty trash for project

### Sharing
- `GET /api/projects/:id/share` - Get share link
- `POST /api/projects/:id/share` - Create share link
- `PATCH /api/share-links/:id` - Toggle share link
- `GET /api/public/:slug` - Public project view

## User Preferences
- Dark mode toggle available
- Emerald green theme throughout
- Full Arabic language interface
- RTL (right-to-left) layout

## Deployment

### Option 1: Cloudflare Pages + Render (Recommended for Production)
See `cloudflare-deploy-guide.md` for detailed instructions.

- **Frontend**: Cloudflare Pages (fast global CDN)
- **Backend**: Render (Node.js hosting)
- **Required**: `VITE_API_URL` in Cloudflare pointing to Render backend

### Option 2: Replit Deployments (Simplest)
- Click Deploy button in Replit
- Everything works together automatically
- No separate configuration needed

### Environment Variables for Production

**Backend (Render):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)
- `SUPABASE_ANON_KEY` - Public anon key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `SESSION_SECRET` - Random secret for sessions
- `FRONTEND_URL` - Cloudflare Pages URL (for CORS)
- `NODE_ENV` - Set to `production`

**Frontend (Cloudflare Pages):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key
- `VITE_API_URL` - Backend API URL (no trailing slash)

### RLS Configuration
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS
- RLS policies in `supabase_rls_policies.sql` for additional security
- Service role policies allow full backend access
- User policies restrict frontend access to own data

## Recent Changes
- **Hono Migration**: Migrated backend from Express to Hono framework
  - Cleaner, more modern API framework
  - Full Cloudflare Workers compatibility
  - Native multipart form handling
  - Smaller bundle size
  - server/app.ts contains all API routes
  - server/worker.ts for Cloudflare Workers deployment
  - wrangler.jsonc configured for CF Workers
- **Teacher Profile Management**: Complete profile system for teachers
  - Profile schema with region, city, school_name, specialization, job_title fields
  - Auto-profile creation on first Google sign-in (upsert pattern)
  - Profile Settings page at /profile route with Arabic RTL form
  - Teacher professional info displayed in public project viewer header
  - Profile link added to dashboard user dropdown menu
    - Items are moved to trash instead of permanent deletion
  - Google Drive items are also moved to trash (not permanently deleted)
  - Trash pages for viewing, restoring, and permanently deleting items
  - Empty trash functionality with confirmation dialogs
  - Dashboard trash page at /dashboard/trash
  - Project-specific trash page at /project/:id/trash
- Added database repository layer for Supabase PostgreSQL
- Created TypeScript types for all database tables (profiles, drive_connections, projects, folders, files_metadata, share_links, audit_logs)
- Implemented CRUD operations with RLS compliance
- Hidden sensitive fields (refresh_token_encrypted) from client
- Added public privacy policy page (/privacy)
- Full Arabic translation with RTL layout support
- Tajawal font integration for Arabic text
- Translated all pages: landing, dashboard, project-detail, public-viewer, privacy-policy
- Translated all components: file-browser, share-dialog, project-card, create-project-dialog
- RTL-specific icon adjustments for navigation
- Initial implementation of Teacher File Organizer
- Google OAuth with Supabase Auth
- Google Drive integration for file storage
- QR code generation for project sharing
- Public viewer for supervisors
- **Public QR Code Generator**: Added a free public QR code generator on the landing page
  - Accessible to all visitors (no login required)
  - URL to QR code conversion
  - Color customization (6 color palettes: أسود، أزرق، أخضر، أحمر، بنفسجي، رمادي)
  - Option to embed MOE logo in the center
  - PNG download functionality
  - Fully client-side implementation (no server load)
