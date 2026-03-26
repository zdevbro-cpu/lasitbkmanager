import psycopg
import os

# Supabase (LAS-Mgmt) Direct Connection Info
DB_URL = "postgresql://postgres:Kevin0371_@db.sgxnxbhbyvrmgrzhosyh.supabase.co:5432/postgres"

def run_schema_fix():
    print("🚀 Running final schema adjustments for LAS-Mgmt unification (Direct)...")
    
    commands = [
        # 1. users 테이블 컬럼 추가
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_uid uuid UNIQUE;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code character varying(20) UNIQUE;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role character varying(50) DEFAULT 'staff';",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id uuid;",
        
        # 2. branches 테이블 컬럼 추가 (code 컬럼은 itbookmanager 호환성 위해 필수)
        "ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code character varying(10) UNIQUE;",
        
        # 3. members 테이블 상세 컬럼 보완
        "ALTER TABLE public.members ADD COLUMN IF NOT EXISTS assigned_instructor character varying(100);",
        "ALTER TABLE public.members ADD COLUMN IF NOT EXISTS joined_at date;",
        "ALTER TABLE public.members ADD COLUMN IF NOT EXISTS content_start_week integer DEFAULT 1;",
        "ALTER TABLE public.members ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1;",
        "ALTER TABLE public.members ADD COLUMN IF NOT EXISTS store_id uuid;"
    ]
    
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                for cmd in commands:
                    try:
                        cur.execute(cmd)
                        print(f"  ✅ Executed: {cmd[:50]}...")
                    except Exception as e:
                        print(f"  ❌ Error executing '{cmd[:30]}': {e}")
                conn.commit()
        print("\n✨ Schema adjustments completed successfully!")
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")

if __name__ == "__main__":
    run_schema_fix()
