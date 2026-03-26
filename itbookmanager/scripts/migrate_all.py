import psycopg
import requests
import json
import uuid
from decimal import Decimal
from datetime import datetime, date

# 1. 설정
LOCAL_DB_URL = "postgresql://postgres:Kevin0371_@localhost:5432/itbookmanager"
SUPABASE_URL = "https://sgxnxbhbyvrmgrzhosyh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneG54YmhieXZybWdyemhvc3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMDMzMywiZXhwIjoyMDczNDc2MzMzfQ.sY7BtiTgqL5wlHbnn41i9tnNecn5NALF9AUQUA93ZsI"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# 캐시 변수
auth_user_cache = {}

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)): return obj.isoformat()
        if isinstance(obj, Decimal): return float(obj)
        if isinstance(obj, uuid.UUID): return str(obj)
        return super().default(obj)

def supabase_post(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    return requests.post(url, headers=HEADERS, data=json.dumps(data, cls=CustomEncoder))

def supabase_patch(table, filters, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    return requests.patch(url, headers=HEADERS, data=json.dumps(data, cls=CustomEncoder))

def load_auth_users():
    """Auth의 모든 유저를 페이지네이션하며 캐싱 (500명 이상 대응)"""
    global auth_user_cache
    print("  🔍 Auth 사용자 캐시 로드 중 (페이지네이션)...")
    page = 1
    per_page = 100
    while True:
        url = f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page={per_page}"
        resp = requests.get(url, headers=HEADERS)
        if resp.status_code == 200:
            data = resp.json()
            users = data.get('users', [])
            if not users:
                break
            for u in users:
                auth_user_cache[u.get('email')] = u.get('id')
            print(f"    - {page}페이지 로드 완료 ({len(users)}명)")
            if len(users) < per_page:
                break
            page += 1
        else:
            print(f"  ❌ Auth 로드 실패: {resp.status_code}")
            break
    print(f"  ✅ 총 {len(auth_user_cache)}명의 Auth 사용자 정보 로드 완료")

def migrate_auth_user(email, password, metadata):
    global auth_user_cache
    if email in auth_user_cache:
        return auth_user_cache[email]
    
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    payload = {"email": email, "password": password, "email_confirm": True, "user_metadata": metadata}
    resp = requests.post(url, headers=HEADERS, data=json.dumps(payload))
    if resp.status_code in [200, 201]:
        uid = resp.json()["id"]
        auth_user_cache[email] = uid
        return uid
    return None

def run_migration():
    print("🚀 최적화된 마이그레이션 작업을 시작합니다...")
    load_auth_users()
    
    with psycopg.connect(LOCAL_DB_URL, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            # Phase A: 보안 강화 (평문 비밀번호 제거)
            print("\n🛡️ Phase A: [las-mgmt] 보안 강화 진행 중...")
            users_resp = requests.get(f"{SUPABASE_URL}/rest/v1/users?select=*", headers=HEADERS)
            if users_resp.status_code == 200:
                for lu in users_resp.json():
                    # 비밀번호가 있거나 UID가 비어있으면 처리
                    if lu.get('password') or not lu.get('auth_uid'):
                        uid = migrate_auth_user(lu['email'], lu.get('password') or "fallback_pw_1234", {"name": lu['name']})
                        if uid:
                            # 'users' 테이블 업데이트 (UID 연결 및 비밀번호 제거)
                            # NOT NULL 제약조건이 있을 수 있으므로 Placeholder 문자열 사용
                            patch_resp = supabase_patch("users", f"id=eq.{lu['id']}", {
                                "auth_uid": uid,
                                "password": "MIGRATED_TO_SUPABASE_AUTH"
                            })
                            if patch_resp.status_code in [200, 204]:
                                print(f"  ✅ {lu['email']} -> 보안 강화(Marker 적용) 성공")
                            else:
                                print(f"  ❌ {lu['email']} 패치 실패: {patch_resp.text}")
            
            print("  ✅ 유저 보안 강화 단계 완료")

            # Phase B: 매장 및 관리자
            print("\n🏢 Phase B: 매장 및 관리자 정보 이관...")
            cur.execute("SELECT * FROM stores")
            stores = cur.fetchall()
            store_map = {}
            for s in stores:
                check = requests.get(f"{SUPABASE_URL}/rest/v1/branches?name=eq.{s['name']}&select=id", headers=HEADERS).json()
                if not check:
                    r = supabase_post("branches", {"name": s['name'], "code": s['code'], "address": s['address'], "phone": s['phone'], "show_on_map": True})
                    if r.status_code in [200, 201]: store_map[s['id']] = r.json()[0]['id']
                else: store_map[s['id']] = check[0]['id']
            
            cur.execute("SELECT * FROM admin_users")
            for a in cur.fetchall():
                if a.get('store_id') in store_map: a['store_id'] = store_map[a['store_id']]
                supabase_post("admin_users", a)

            # Phase C/D: 하위 테이블
            tables = ["tablets", "members", "content_packages", "content_items", "tablet_loans", "payments", "refunds", "education_sessions", "member_content_progress"]
            for table in tables:
                print(f"📦 {table} 이관 중...")
                cur.execute(f"SELECT * FROM {table}")
                rows = cur.fetchall()
                if rows:
                    resp = supabase_post(table, rows)
                    if resp.status_code in [200, 201]: print(f"  ✅ {table}: {len(rows)}개 완료")
                    else: print(f"  ❌ {table} 실패: {resp.text}")

    print("\n🎉 모든 통합 작업이 완료되었습니다!")

if __name__ == "__main__":
    run_migration()
