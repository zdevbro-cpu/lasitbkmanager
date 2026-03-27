import psycopg
import requests
import json
import uuid

# 설정
LOCAL_DB_URL = "postgresql://postgres:Kevin0371_@localhost:5432/itbookmanager"
SUPABASE_URL = "https://sgxnxbhbyvrmgrzhosyh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneG54YmhieXZybWdyemhvc3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMDMzMywiZXhwIjoyMDczNDc2MzMzfQ.sY7BtiTgqL5wlHbnn41i9tnNecn5NALF9AUQUA93ZsI"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (uuid.UUID,)): return str(obj)
        import datetime
        if isinstance(obj, (datetime.datetime, datetime.date)): return obj.isoformat()
        import decimal
        if isinstance(obj, decimal.Decimal): return float(obj)
        return super().default(obj)

def migrate_members():
    print("🚀 멤버(학생) 마이그레이션 및 Auth 생성을 시작합니다...")
    
    with psycopg.connect(LOCAL_DB_URL, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            # 1. 로컬 멤버 조회
            cur.execute("SELECT * FROM members")
            members = cur.fetchall()
            print(f"  🔍 로컬 멤버 {len(members)}명 발견")

            for m in members:
                email = m['email']
                # 비밀번호 필드명이 'password'인지 확인 (로컬 DB 스키마에 따라 수정 가능)
                password = m.get('password') or "las-student-123" # 기본값
                
                # 2. Supabase Auth 생성
                auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
                payload = {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"name": m['name'], "role": "member"}
                }
                
                print(f"  👤 {email} 처리 중...")
                auth_resp = requests.post(auth_url, headers=HEADERS, data=json.dumps(payload, cls=CustomEncoder))
                
                auth_uid = None
                if auth_resp.status_code in [200, 201]:
                    auth_uid = auth_resp.json()["id"]
                    print(f"    ✅ Auth 생성 성공 (UID: {auth_uid})")
                elif auth_resp.status_code == 422: # 이미 존재하는 경우
                    # 기존 유저 조회 시도
                    search_url = f"{SUPABASE_URL}/auth/v1/admin/users?email=eq.{email}"
                    # v1/admin/users 는 필터링이 안 될 수 있으므로 전체 로드 캐시 방식 사용 추천
                    # 여기서는 간단히 하기 위해 무시하거나 별도 처리
                    print(f"    ⚠️ Auth 계정 이미 존재함 (건너뜀)")
                    # 기존 UID를 찾기 위해 별도 로직 필요할 수 있음
                else:
                    print(f"    ❌ Auth 생성 실패: {auth_resp.text}")
                    continue

                # 3. Supabase members 테이블 저장/업데이트
                m['auth_uid'] = auth_uid
                # 로컬 row 데이터를 JSON으로 변환 (Decimal 등 처리)
                # m 데이터에서 password 및 auth_uid는 제거 (auth_uid 컬럼이 DB에 없을 수 있으므로)
                if 'password' in m: del m['password']
                if 'auth_uid' in m: del m['auth_uid']
                
                rest_url = f"{SUPABASE_URL}/rest/v1/members"
                rest_resp = requests.post(rest_url, headers=HEADERS, data=json.dumps(m, cls=CustomEncoder))
                
                if rest_resp.status_code in [200, 201]:
                    print(f"    ✅ DB 데이터 저장 성공")
                else:
                    # 이미 존재하면 PATCH
                    patch_url = f"{SUPABASE_URL}/rest/v1/members?id=eq.{m['id']}"
                    patch_resp = requests.patch(patch_url, headers=HEADERS, data=json.dumps(m, cls=CustomEncoder))
                    if patch_resp.status_code in [200, 204]:
                        print(f"    ✅ DB 데이터 업데이트(PATCH) 성공")
                    else:
                        print(f"    ❌ DB 저장 실패: {patch_resp.text}")

if __name__ == "__main__":
    migrate_members()
