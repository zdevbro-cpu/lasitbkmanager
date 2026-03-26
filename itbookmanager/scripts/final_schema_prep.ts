import { db } from './api/src/db';
import dotenv from 'dotenv';
import path from 'path';

// Load API env
dotenv.config({ path: path.resolve(process.cwd(), 'api/.env') });

async function runPreWork() {
  console.log("🚀 Starting System Integration Pre-work...");
  
  try {
    console.log("🛠 Updating Supabase schema for unified use...");
    
    // 1. users 테이블 컬럼 추가
    await db.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_uid uuid UNIQUE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code character varying(20) UNIQUE;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role character varying(50) DEFAULT 'staff';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch_id uuid;
    `);
    console.log("  ✅ users table updated.");

    // 2. branches 테이블 컬럼 추가
    await db.query(`
      ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code character varying(10) UNIQUE;
    `);
    console.log("  ✅ branches table updated.");

    // 3. members 테이블 상세 컬럼 보완 (itbookmanager 필수 필드)
    await db.query(`
      ALTER TABLE public.members ADD COLUMN IF NOT EXISTS assigned_instructor character varying(100);
      ALTER TABLE public.members ADD COLUMN IF NOT EXISTS joined_at date;
      ALTER TABLE public.members ADD COLUMN IF NOT EXISTS content_start_week integer DEFAULT 1;
      ALTER TABLE public.members ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1;
      ALTER TABLE public.members ADD COLUMN IF NOT EXISTS store_id uuid;
    `);
    console.log("  ✅ members table updated.");

    console.log("\n✨ Pre-work Schema adjustments completed successfully!");
  } catch (err) {
    console.error("❌ Pre-work failed:", err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runPreWork();
