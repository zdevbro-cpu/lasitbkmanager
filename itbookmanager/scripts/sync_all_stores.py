import requests
import psycopg
import json

SUPABASE_URL = "https://sgxnxbhbyvrmgrzhosyh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneG54YmhieXZybWdyemhvc3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMDMzMywiZXhwIjoyMDczNDc2MzMzfQ.sY7BtiTgqL5wlHbnn41i9tnNecn5NALF9AUQUA93ZsI"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

def sync_all_stores():
    # 1. Local Stores 에서 ID와 Name 가져오기
    conn = psycopg.connect('postgresql://postgres:Kevin0371_@localhost:5432/itbookmanager')
    cur = conn.cursor(row_factory=psycopg.rows.dict_row)
    cur.execute('SELECT id, name FROM stores')
    local_stores = {r['name']: str(r['id']) for r in cur.fetchall()}
    conn.close()

    # 2. Supabase Branches 에서 ID와 Name 가져오기
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/branches?select=id,name", headers=HEADERS)
    sb_branches = {b['name']: b['id'] for b in resp.json()}

    # 3. 매핑 생성 (Local ID -> Supabase ID)
    mapping = {}
    for name, local_id in local_stores.items():
        if name in sb_branches:
            mapping[local_id] = sb_branches[name]
    
    # 4. 일괄 업데이트 (PostgREST는 단일 요청으로 다중 필터 업데이트가 복잡하므로 개별 처리)
    tables = [("tablets", "store_id"), ("members", "store_id"), ("users", "branch_id"), ("admin_users", "store_id")]
    
    for old_id, new_id in mapping.items():
        if old_id == new_id: continue # 이미 같으면 통과
        print(f"🔄 Syncing: {old_id} -> {new_id}")
        for table, column in tables:
            r = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?{column}=eq.{old_id}", headers=HEADERS, json={column: new_id})
            if r.status_code < 300:
                print(f"  ✅ {table}.{column} updated.")

if __name__ == "__main__":
    sync_all_stores()
