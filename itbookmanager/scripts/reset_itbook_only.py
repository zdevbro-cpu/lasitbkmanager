import requests
import json
import time

SUPABASE_URL = "https://sgxnxbhbyvrmgrzhosyh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneG54YmhieXZybWdyemhvc3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMDMzMywiZXhwIjoyMDczNDc2MzMzfQ.sY7BtiTgqL5wlHbnn41i9tnNecn5NALF9AUQUA93ZsI"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

def reset_itbook_passwords():
    print("🚀 itbookmanager 유저들의 비밀번호를 '123456'으로 초기화합니다...")
    
    # 1. itbookmanager 스태프 (admin_users 테이블)
    print("  👥 itbookmanager 스태프(admin_users) 처리 중...")
    admin_users_resp = requests.get(f"{SUPABASE_URL}/rest/v1/admin_users?select=auth_uid,email", headers=HEADERS)
    if admin_users_resp.status_code == 200:
        admin_users = admin_users_resp.json()
        for u in admin_users:
            uid = u.get('auth_uid')
            if not uid: continue
            
            reset_resp = requests.put(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", headers=HEADERS, json={"password": "123456"})
            if reset_resp.status_code in [200, 201]:
                print(f"    ✅ {u['email']} reset")
            else:
                print(f"    ❌ {u['email']} 실패: {reset_resp.text}")
            time.sleep(0.05)
    
    # 2. itbookmanager 학생 (metadata의 role='member'인 전체 유저 검색)
    print("  🎓 itbookmanager 학생(members) 처리 중...")
    page = 1
    per_page = 100
    while True:
        url = f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page={per_page}"
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code != 200: break
        
        users = resp.json().get('users', [])
        if not users: break
        
        for u in users:
            metadata = u.get('user_metadata', {})
            # itbookmanager 마이그레이션 시 role='member' 또는 IT북매니저 관련 메타데이터 확인
            if metadata.get('role') == 'member':
                uid = u['id']
                email = u['email']
                reset_resp = requests.put(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", headers=HEADERS, json={"password": "123456"})
                if reset_resp.status_code in [200, 201]:
                    print(f"    ✅ member {email} reset")
                else:
                    print(f"    ❌ member {email} 실패: {reset_resp.text}")
                time.sleep(0.05)
        
        if len(users) < per_page: break
        page += 1

if __name__ == "__main__":
    reset_itbook_passwords()
