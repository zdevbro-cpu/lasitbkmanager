# 📘 itbookmanager 개발 가이드 (모듈형 협업 전략)

이 문서는 **Antigravity**와 **Claude**가 `itbookmanager` 프로젝트를 공동으로 효율적으로 개발하기 위한 지침서입니다. 특히 토큰 사용량을 최적화하고 각 모델이 독립적으로 작업을 진행할 수 있도록 **모듈형 개발 방식**을 정의합니다.

---

## 🏗️ 1. 프로젝트 구조 (Monorepo)

본 프로젝트는 다음과 같은 워크스페이스로 구성된 모노레포 구조입니다.

| 워크스페이스 | 경로 | 역할 |
| :--- | :--- | :--- |
| **`packages/shared`** | `packages/shared/` | 공통 타입(Type), 유틸리티, 비즈니스 로직(기능) 정의 |
| **`admin`** | `admin/` | 관리자용 웹 대시보드 (React/Vite) |
| **`app`** | `app/` | 사용자/직원용 웹 앱 (React/Vite) |
| **`api`** | `api/` | 백엔드 API 서비스 (Node.js/Express) |
| **`database`** | `database/` | 스키마 정의 및 마이그레이션 (`migrate.js`) |

---

## 🔍 2. 모듈형 개발 전략 (Token Optimization)

AI 에이전트의 토큰 소모를 줄이기 위해, 모든 작업은 **독립적인 모듈 단위**로 나누어 진행합니다.

1.  **컨텍스트 최소화**: 한 번에 수십 개의 파일을 읽지 않습니다. 현재 작업 중인 모듈(예: `admin/src/pages/mdm`)과 연관된 필수 파일(API 명세, 데이터 타입)만 읽습니다.
2.  **인터페이스 선행 정의**: 새로운 기능을 개발할 때는 `packages/shared`나 `api/src/types` 등에 데이터 인터페이스를 먼저 정의하여 각 파트가 이를 기준으로 독립적으로 작업할 수 있게 합니다.
3.  **순차적 구현**: `Back-end API` -> `Shared Logic` -> `Front-end Component` 순서로 작업을 완료하고, 각 단계가 끝날 때마다 결과물을 확정합니다.

---

## 🛠️ 3. 기술 스택 및 코딩 컨벤션

*   **언어**: TypeScript (엄격한 타입 체크 지향)
*   **프론트엔드**: React, Tailwind CSS (또는 프로젝트 내 지정된 CSS 방식)
*   **백엔드**: Node.js, Express
*   **데이터베이스**: PostgreSQL (또는 프로젝트 내 지정된 DB)
*   **명명 규칙**:
    *   컴포넌트/파일: `PascalCase.tsx`
    *   상수/변수: `camelCase`
    *   타입/인터페이스: `InterfaceName`, `TypeName`

---

## 🤝 4. Antigravity & Claude 협업 프로토콜

### **Antigravity (Lead Orchestrator / Architect)**
*   전체 아키텍처 및 복잡한 모듈 설계 담당.
*   공통 레이어(`shared`) 작성 및 데이터베이스 스키마 수정.
*   터미널 명령 실행, 의존성 설치, 환경 설정 등 물리적 작업 주도.

### **Claude (Implementation Specialist / Feature Expert)**
*   개별 UI 컴포넌트(`pages`, `components`)의 세부 구현.
*   단위 테스트 작성 및 코드 가독성 향상(Refactoring).
*   기존 코드의 버그 분석 및 수정.

---

## 🤖 5. 클로드를 위한 특별 지시사항 (Claude Rules)

> **[IMPORTANT]** 클로드님, 작업을 시작할 때 이 가이드를 반드시 숙지해 주세요.
> 1.  필요 이상의 파일을 읽지 마세요. 토큰 사용량을 최소화하기 위해 현재 작업 중인 파일과 직결된 `types`, `services` 파일만 골라서 읽어주세요.
> 2.  Antigravity 에이전트가 `PROJECT_PLAN.md`(또는 진행 상황 기록 파일)를 통해 지시사항을 남길 경우, 그 지시사항을 최우선으로 따릅니다.
> 3.  코드 작성 시 프로젝트 전체의 패턴(예: `api` 컨트롤러의 에러 핸들링 방식)을 먼저 분석하고 일관성 있게 작성하세요.
> 4.  구현 완료 후에는 해당 모듈의 핵심 변경 사항을 짧게 요약하여 작업 종료를 알립니다.

---

## 📋 6. 현재 작업 현황 (Current Progress)

*   **현재 집중 모듈**: `지점 관리 및 태블릿 계층 구조 고도화 (MDM)`
*   **관련 파일**:
    *   `admin/src/pages/admin/StoreList.page.tsx`
    *   `admin/src/pages/mdm/TabletList.page.tsx`, `TabletRegister.page.tsx`, `TabletDetail.page.tsx`
    *   `admin/src/services/tablets.service.ts`
*   **완료 사항**:
    *   **지점 관리 레이아웃**: `max-w-7xl` 확장 및 `Pencil`, `Power` 아이콘 적용 (Premium UI).
    *   **태블릿 계층화**: 본사-라스브러리(지점)-라스몰(배분처) 구조 반영.
    *   **태블릿 권한 강화**: 지점 관리자는 소속 라스브러리 태블릿만 조회/등록 가능 및 상세 페이지 접근 제어.
    *   **UI 보강**: 태블릿 관리 헤더에 라스브러리 코드(배지)와 명칭 노출.
*   **다음 작업**: 태블릿 대여/반납 로직에 지점별 회원 필터링 연동 검토.

---

## 🔐 7. 협업 메모 (For Claude)

*   **지점(Store) = 라스브러리**: 모든 UI 명칭은 사용자 친화적으로 '지점' 대신 '라스브러리'로 점진적 교체 중입니다.
*   **하위 배분처**: 태블릿 모델 내 `sub_store_name` 필드가 추가되었으며, 이는 지점 산하의 '라스몰'이나 특정 매장을 의미합니다.
*   **작업 충돌 방지**: 태블릿 관련 `Service`나 `API` 수정 시 반드시 `sub_store_name` 필드를 유지해 주세요.

**수정 기록**: 2026-03-25 생성 (Antigravity)
