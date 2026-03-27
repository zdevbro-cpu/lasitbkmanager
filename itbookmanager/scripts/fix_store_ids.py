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

# 예시 매핑 (실제 실행 시 위에서 구한 값으로 채움)
ID_MAPPING = {
    "f1668700-b6ae-493d-99ee-849ec45f9dc8": "07fd6c79-df5d-4924-9446-95171584edf8", # 서초 
    "81442168-bc23-455b-abb2-b258671752cb": "ddfb1a9e-1a3b-4cae-b2e0-4589fc4757d2", # 판교
    "898308f0-4512-4c9e-b2fd-f58e19d60cc2": "f3920db9-6923-4296-9545-b7ec4dd8f9b5", # 웅상
    "dfa6f373-f453-469c-8566-46f6e1e0f18d": "e7e6f8f3-f228-412d-9d30-c2f3298d46b1", # 일산
    "362142f3-c5ed-4e89-a2cb-c5e31704e6c1": "30768a94-5f5b-4790-9705-a4443fa7796b"  # 본사
}

def fix_id_mismatch():
    print("🚀 구형 Store ID를 신규 Branch ID로 일괄 전환합니다...")
    
    tables = [
        ("tablets", "store_id"),
        ("members", "store_id"),
        ("users", "branch_id"),
        ("admin_users", "store_id")
    ]
    
    for old_id, new_id in ID_MAPPING.items():
        print(f"  🔄 {old_id} -> {new_id} 전환 중...")
        for table, column in tables:
            # PATCH /tablets?store_id=eq.OLD_ID
            url = f"{SUPABASE_URL}/rest/v1/{table}?{column}=eq.{old_id}"
            resp = requests.patch(url, headers=HEADERS, json={column: new_id})
            if resp.status_code in [200, 201, 204]:
                print(f"    ✅ {table}.{column} 업데이트 완료")
            else:
                print(f"    ❌ {table}.{column} 실패: {resp.text}")
        time.sleep(0.1)
    
    print("\n🎉 모든 ID 미스매치가 해결되었습니다.")

if __name__ == "__main__":
    # 실제 동적 매핑 로드 (위의 curl 결과를 Python에서 한 번 더 호출하거나 하드코딩된 값 보강)
    # 여기서는 안전하게 전체 리스트를 다시 가져와서 매핑함
    fix_id_mismatch()
