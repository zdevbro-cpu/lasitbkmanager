import requests
import json
import time
import psycopg

# 설정
LOCAL_DB_URL = "postgresql://postgres:Kevin0371_@localhost:5432/itbookmanager"
SUPABASE_URL = "https://sgxnxbhbyvrmgrzhosyh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneG54YmhieXZybWdyemhvc3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMDMzMywiZXhwIjoyMDczNDc2MzMzfQ.sY7BtiTgqL5wlHbnn41i9tnNecn5NALF9AUQUA93ZsI"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

def final_staff_merge():
    print("🚀 itbookmanager 스태프 10명을 'users' 테이블로 통합 중...")
    
    with psycopg.connect(LOCAL_DB_URL, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM admin_users")
            staff = cur.fetchall()
            
            for s in staff:
                email = s['email']
                print(f"  👤 {email} 처리 중...")
                
                # 1. Auth UID 가져오기 (admin_users 테이블에서 이미 생성된 것 확인)
                check_admin = requests.get(f"{SUPABASE_URL}/rest/v1/admin_users?email=eq.{email}&select=auth_uid", headers=HEADERS).json()
                auth_uid = check_admin[0].get('auth_uid') if check_admin else None
                
                if not auth_uid:
                    print(f"    ⚠️ Auth UID 없음. 건너뜀")
                    continue
                
                # 2. 'users' 테이블에 통합 (id는 admin_users의 id 유지)
                # las-mgmt의 'users' 테이블 형식에 맞춤
                user_payload = {
                    "id": str(s['id']),
                    "name": s['name'],
                    "email": email,
                    "auth_uid": auth_uid,
                    "user_type": "점장" if s['role'] != 'system_admin' else "시스템관리자",
                    "status": "approved",
                    "password": "MIGRATED_TO_SUPABASE_AUTH"
                }
                
                resp = requests.post(f"{SUPABASE_URL}/rest/v1/users", headers=HEADERS, json=user_payload)
                if resp.status_code in [200, 201]:
                    print(f"    ✅ users 테이블로 통합 성공")
                else:
                    # 이미 존재하면 업데이트
                    requests.patch(f"{SUPABASE_URL}/rest/v1/users?id=eq.{s['id']}", headers=HEADERS, json=user_payload)
                    print(f"    ✅ users 테이블 업데이트 완료")
                    
                # 3. 비밀번호 123456으로 초기화
                requests.put(f"{SUPABASE_URL}/auth/v1/admin/users/{auth_uid}", headers=HEADERS, json={"password": "123456"})
                print(f"    🔑 비밀번호 '123456' 설정 완료")
                
                time.sleep(0.05)

if __name__ == "__main__":
    final_staff_merge()
