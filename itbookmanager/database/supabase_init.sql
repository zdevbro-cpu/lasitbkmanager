-- Supabase Initialization for Unified itbookmanager & las-mgmt
-- 이 파일은 Supabase 프로젝트의 'SQL Editor'에서 실행해 주세요.

-- 0. 기존 타입 생성 (없는 경우에만)
DO $$ BEGIN
    CREATE TYPE public.content_type AS ENUM ('video', 'audio', 'pdf', 'book_metadata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.loan_action AS ENUM ('loaned', 'returned', 'lost_reported', 'recovered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'suspended', 'ended', 'pending_withdrawal', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.member_type AS ENUM ('managed', 'subscription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('paid', 'unpaid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.refund_status AS ENUM ('requested', 'processing', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.tablet_status AS ENUM ('stock', 'loaned', 'returned', 'repair', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. admin_users (itbookmanager 전용 정보)
-- 참고: las-mgmt의 'users' 테이블과 통합 가능성이 높으므로, store_id를 'users'에 추가하는 것이 더 깔끔할 수 있습니다.
-- 현재는 itbookmanager 앱의 호환성을 위해 유지하되, 나중에 'users' 뷰로 대체 가능.
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    auth_uid character varying(128) UNIQUE NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    role character varying(50) DEFAULT 'staff',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    store_id uuid,
    phone character varying(20)
);

-- 2. members
CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    member_number character varying(20) UNIQUE NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) UNIQUE NOT NULL,
    phone character varying(20),
    member_status public.member_status DEFAULT 'active' NOT NULL,
    member_type public.member_type DEFAULT 'managed' NOT NULL,
    qr_code character varying(20) UNIQUE,
    current_tablet_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_id uuid
);

-- 3. tablets
CREATE TABLE IF NOT EXISTS public.tablets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    qr_code character varying(20) UNIQUE NOT NULL,
    model_name character varying(100),
    serial_number character varying(100),
    purchase_date date,
    purchase_price integer,
    status public.tablet_status DEFAULT 'stock' NOT NULL,
    current_member_id uuid,
    loan_start_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    store_id uuid
);

-- 4. tablet_loans
CREATE TABLE IF NOT EXISTS public.tablet_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tablet_id uuid NOT NULL,
    member_id uuid,
    action public.loan_action NOT NULL,
    action_date timestamp with time zone DEFAULT now(),
    returned_date timestamp with time zone,
    condition_ok boolean,
    condition_notes text,
    processed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. content_packages
CREATE TABLE IF NOT EXISTS public.content_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    week_number integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    book_count integer DEFAULT 0,
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

-- 6. content_items
CREATE TABLE IF NOT EXISTS public.content_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    package_id uuid NOT NULL REFERENCES public.content_packages(id) ON DELETE CASCADE,
    title character varying(300) NOT NULL,
    author character varying(200),
    content_type public.content_type NOT NULL,
    storage_path character varying(500),
    file_size_bytes bigint,
    duration_sec integer,
    sort_order integer DEFAULT 0,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.members(id),
    amount integer NOT NULL,
    payment_status public.payment_status DEFAULT 'paid' NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    payment_method character varying(50),
    transaction_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 8. refunds
CREATE TABLE IF NOT EXISTS public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    payment_id uuid NOT NULL REFERENCES public.payments(id),
    member_id uuid NOT NULL,
    penalty_amount integer DEFAULT 0,
    tablet_deduction integer DEFAULT 0,
    refund_amount integer NOT NULL,
    status public.refund_status DEFAULT 'requested',
    reason text NOT NULL,
    tablet_returned boolean DEFAULT false,
    refund_date date,
    processed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 9. education_sessions (교육 세션)
CREATE TABLE IF NOT EXISTS public.education_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title character varying(200) NOT NULL,
    session_date timestamp with time zone NOT NULL,
    enrollment_deadline timestamp with time zone,
    max_capacity integer,
    current_enrollment integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 10. LMS 진행 상태 (진도)
CREATE TABLE IF NOT EXISTS public.member_content_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.members(id),
    content_item_id uuid NOT NULL REFERENCES public.content_items(id),
    last_accessed timestamp with time zone DEFAULT now(),
    completion_percentage integer DEFAULT 0,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 11. LAS-Mgmt 필수 업데이트: users 테이블에 branch_id 추가 (itbookmanager 호환성)
-- 기존 'branch' (String) 필드를 유지하면서 ID 기반 참조를 위해 'branch_id' 추가 권장
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS referral_code character varying(20) UNIQUE;

-- 12. branches (이미 las-mgmt에 있을 가능성 높음, 부족한 필드 보완)
-- las-mgmt의 'branches' 테이블에 itbookmanager용 'code' 필드 추가
ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS code character varying(10);
