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

def reset_all_passwords():
    print("🚀 모든 사용자 비밀번호를 '123456'으로 초기화합니다...")
    
    page = 1
    per_page = 100
    total_reset = 0
    
    while True:
        url = f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page={per_page}"
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code != 200:
            print(f"❌ 사용자 목록 로드 실패: {resp.text}")
            break
            
        users = resp.json().get('users', [])
        if not users:
            break
            
        print(f"  📦 {page}페이지({len(users)}명) 처리 중...")
        for u in users:
            uid = u['id']
            email = u['email']
            
            # 비밀번호 초기화 (PUT /admin/users/{id})
            reset_url = f"{SUPABASE_URL}/auth/v1/admin/users/{uid}"
            reset_resp = requests.put(reset_url, headers=HEADERS, json={"password": "123456"})
            
            if reset_resp.status_code in [200, 201]:
                total_reset += 1
                if total_reset % 10 == 0:
                    print(f"    ✨ {total_reset}명 완료...")
            else:
                print(f"    ❌ {email} 초기화 실패: {reset_resp.text}")
                
            time.sleep(0.05)
            
        if len(users) < per_page:
            break
        page += 1
        
    print(f"\n🎉 총 {total_reset}명의 비밀번호가 '123456'으로 변경되었습니다.")

if __name__ == "__main__":
    reset_all_passwords()
