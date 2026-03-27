# 태블릿 프로비저닝 및 QR 생성 개발 계획서

## 1. 개요
* **목적**: MDM(Mobile Device Management) 환경에서 다수의 안드로이드 태블릿을 효율적으로 세팅하고 고유 식별 처리하기 위한 자동화 프로세스 구축.
* **핵심 전략**: 기기마다 별도의 앱(APK)을 빌드하지 않고 **단일 동일(Single) APK**를 사용하며, PC에서 **ADB 연결을 통해 기기별 고유 식별자(`device_id`)를 파일 형태로 주입**하는 방식.

## 2. 시스템 아키텍처 및 작업 흐름 (Workflow)

### 2.1 PC (관리 프로그램) 역할
1. **기기 연결 및 인식**: 태블릿을 C타입 포트로 연결하고 ADB를 통해 연결 감지 및 기기 시리얼 번호 확인 (`adb devices`).
2. **식별자 할당**: 매칭된 태블릿의 기기 고유 ID (`device_id`) 생성 (예: `TAB-0001`).
3. **설정 파일 생성**: PC 로컬에 주입할 텍스트 파일 생성.
   * 파일명: `device.txt`
   * 내용: `device_id=TAB-0001`
4. **파일 전송 (ADB)**: `adb push device.txt /sdcard/device.txt` 명령어를 실행하여 태블릿 내부에 식별 정보 주입.
5. *(선택)* 최초 세팅 시 `adb install` 명령어를 통해 공용 APK 자동 설치.

### 2.2 디바이스 (안드로이드 APK) 역할
1. **파일 읽기**: 앱 실행 시, 단말 내 약속된 경로(`/sdcard/device.txt`)의 파일을 스캔 및 읽기(Read).
2. **정보 파싱**: 파일의 내용을 줄 단위로 파싱하여 `device_id` 값 추출.
3. **UI 분기 처리**:
   * **성공 시 (파일 존재 및 파싱 완료)**: 해당 `device_id` 값을 기반으로 로컬에서 QR 코드를 생성하여 화면에 표시.
   * **실패 시 (파일 없음)**: "미등록 기기"라는 안내 텍스트 출력 및 필요시 디버깅/현장 대응을 위한 식별 정보 동시 표시.

---

## 3. 구성 요소별 개발 가이드

### 3.1 PC 프로비저닝 스크립트 (Node.js/Python/Bash 기반 구상)
기기를 USB에 꽂았을 때 즉각 처리되도록 자동화 툴이나 데스크탑 앱(Electron) 형태로 구축.

* **주요 플로우 (Pseudo Code)**:
  ```bash
  # 1. 연결된 디바이스 시리얼 획득
  SERIAL=$(adb get-serialno)

  # 2. 서버 또는 로컬 로직을 통해 시리얼 번호와 매칭된 device_id 확보
  # ex) API 요청 -> TAB-0001 할당 받음
  DEVICE_ID="TAB-0001"

  # 3. 텍스트 파일 작성
  echo "device_id=$DEVICE_ID" > device.txt

  # 4. ADB를 통한 파일 밀어넣기
  adb push device.txt /sdcard/device.txt

  # 완료 플래그 출력
  echo "프로비저닝 완료: $DEVICE_ID"
  ```

### 3.2 안드로이드 앱 (APK) 핵심 로직 처리 (Java / Kotlin)
앱 내에는 네트워크 통신 없이 로컬의 파일만 보고 처리하는 오프라인 주입 구조 설계.

* **핵심 파일 읽기 로직**:
  ```java
  File file = new File("/sdcard/device.txt"); // (주의: 안버전에 따라 권한 및 공용폴더 조정 필요할 수 있음)
  
  if (file.exists()) {
      try {
          BufferedReader br = new BufferedReader(new FileReader(file));
          String line = br.readLine();
          if (line != null && line.contains("=")) {
              String deviceId = line.split("=")[1];
              // TODO: deviceId를 사용해 QR 코드 라이브러리(ZXing 등)로 비트맵 생성 후 ImageView에 세팅
              generateAndShowQR(deviceId);
          }
      } catch (IOException e) {
          e.printStackTrace();
      }
  } else {
      // 파일이 없을 경우 예외 화면 처리
      showUnregisteredDeviceUI();
  }
  ```
* **권한(Permission) 참고사항**: 
  안드로이드 11(API 30) 이상부터는 Scoped Storage 정책으로 인해 최상위 루트 `/sdcard/`에 파일을 쓰고 읽는 것이 까다로울 수 있습니다. 권한 문제를 피하려면, `adb push` 시 해당 앱의 전용 외부 스토리지 디렉토리 (`/sdcard/Android/data/앱패키지명/files/`)에 밀어넣는 것을 권장합니다.

---

## 4. 기대 효과 및 시스템 장점
1. **형상 관리 및 배포 용이**: APK를 태블릿 100대마다 100번 빌드할 필요가 없습니다. 단일 APK 버전을 전사에 동일하게 배포하고 파일만 갈아끼우므로 유지보수가 압도적으로 편리해집니다.
2. **네트워크 환경 무관**: 오프라인 상태에서도 C포트 연결 -> 파일 전송만으로 즉시 디바이스 식별 세팅이 끝납니다.
3. **높은 유연성 (디바이스 교체 대응)**: 현장에서 태블릿 파손/변경이 발생했을 때, 새로운 기기를 C타입 포트에 꽂고 클릭 한 번이면 새 `device.txt`가 주입되어 기기 교체가 10초 내로 끝납니다.
4. **명확한 디버깅 상태 제공**: 기계가 켜졌을 때 파일 유무에 따라 오류를 즉시 인지("미등록 기기" 렌더링)할 수 있어 현장 인원이 즉각적인 장애 판별이 가능합니다.

---

## 5. 다음 진행 단계 (Action Item)
- [ ] **Phase 1**: PC 환경에서 단일 Android 기기 연결 후 `adb devices` 확인 및 임의의 텍스트 파일 push 수동 테스트.
- [ ] **Phase 2**: 안드로이드 앱 단에서 `READ_EXTERNAL_STORAGE` 권한 확보 및 지정된 경로의 파일 읽기, ZXing 기반 QR 화면단 표시 기능 구현.
- [ ] **Phase 3**: PC 측 자동화 프로그램(혹은 스크립트) 개발 완료 (디바이스가 꽂히면 감지 -> 파일 생성 -> Push 자동화).
