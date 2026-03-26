# 📜 Project Integration Source of Truth (SOT)

본 문서는 `itbookmanager`와 `las-mgmt` 시스템 통합 작업이 완료된 후의 **현재 상태와 향후 개발을 위한 지침**을 정리한 것입니다. 다음 AI 세션은 이 내용을 최우선으로 인지해야 합니다.

## 1. 프로젝트 개요 (Current Architecture)
- **통합 백엔드:** Supabase 프로젝트 `las-mgmt` (sgxnxbhbyvrmgrzhosyh)
- **인증 시스템:** Supabase Auth (기존 Firebase Auth 및 로컬 비밀번호 폐쇄)
- **데이터베이스:** Supabase PostgreSQL (로컬 PostgreSQL 데이터는 모두 이관됨)

## 2. 데이터베이스 테이블 표준화 (Standardized Tables)

| 기존 테이블 (itbookmanager) | 통합 테이블 (las-mgmt) | 비고 |
| :--- | :--- | :--- |
| `admin_users` | `users` | `auth_uid` 컬럼으로 계정 연동 |
| `stores` | `branches` | `code` 컬럼 추가됨 |
| `tablets` | `tablets` | `store_id`가 `branches(id)`를 참조 |
| `members` | `members` | `assigned_instructor`, `joined_at` 등 상세 필드 포함 |

## 3. 애플리케이션 상태 (Codebase Status)

### API (`itbookmanager/api`)
- `.env` 파일이 `las-mgmt` Supabase 접속 정보를 사용함.
- `src/db.ts`는 Supabase PostgreSQL(SSL 연결)을 사용함.
- 모든 서비스(`staff.service.ts`, `stores.service.ts`, `tablets.service.ts`)가 `users` 및 `branches` 테이블명을 사용하도록 리팩토링됨.

### Admin/App (`itbookmanager/admin` & `app`)
- `.env` 파일의 `VITE_SUPABASE_URL` 정보가 `las-mgmt`로 업데이트됨.
- 로그인은 Supabase Auth를 통해 수행됨.

### LAS-Mgmt (`las-mgmt`)
- `Login.jsx`, `Signup.jsx`, `HeroPage.jsx`가 **Supabase Auth**를 사용하도록 리팩토링되었습니다. (기존 테이블 직접 비밀번호 대조 방식 폐쇄)
- **배포 필요:** 현재 로컬 코드가 수정되었으므로, 실제 사이트에 반영하려면 Vercel 또는 Firebase로 **배포(Deploy)**를 수행해야 합니다.

## 4. AI를 위한 명령 및 지침 (Instructions for Claude/AI)
1. **데이터 접근:** 더 이상 `itbookmanager`라는 이름의 로컬 DB나 별도의 Supabase 프로젝트를 수정하지 마십시오. 모든 DB 작업은 `sgxnxbhbyvrmgrzhosyh` 프로젝트를 대상으로 합니다.
2. **테이블 명칭:** 코드 수정 시 `admin_users`라는 이름이 보이면 즉시 `users`로, `stores`가 보이면 `branches`로 수정해야 합니다.
3. **보안:** `users` 테이블의 `password` 필드는 더 이상 유효하지 않습니다(보안 마커 적용됨). 인증 관련 작업은 `supabase.auth` API를 사용하십시오.
4. **연동 정합성:** `users`의 `id`(uuid)와 Supabase Auth의 유저 `id`를 `auth_uid` 필드로 매핑하여 관리해야 합니다.

---
*최종 업데이트: 2026-03-26*
