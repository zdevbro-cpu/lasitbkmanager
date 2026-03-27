const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 30001;

// adb 실행 경로 자동 확보 (환경변수 업데이트가 안 된 동일 터미널을 위한 백업)
const adbPath = path.join(process.env.USERPROFILE || 'C:\\', 'platform-tools', 'adb.exe');
let adbCmd = 'adb';
try {
  // 우선 기본 adb가 동작하는지 체크
  execSync('adb version', { stdio: 'ignore' });
} catch (e) {
  // 기본 adb가 안 되면 방금 다운받은 명시적 경로 사용
  if (fs.existsSync(adbPath)) {
    adbCmd = `"${adbPath}"`;
  }
}

// 1. 셸 명령어 실행 도우미
function runShellCommand(cmd) {
  try {
    const finalCmd = cmd.replace(/^adb /g, `${adbCmd} `);
    return execSync(finalCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (err) {
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    throw new Error(`Command failed: ${cmd}\n${err.message}`);
  }
}

app.post('/provision', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization 헤더가 누락되었습니다.' });
    }

    const apiUrl = req.body.apiUrl;
    if (!apiUrl) {
      return res.status(400).json({ message: '백엔드 apiUrl 값이 누락되었습니다.' });
    }

    console.log(`\n[PROVISION START] Connecting to Tablet via USB...`);

    // 2. 연결된 ADB 디바이스 확인
    const devicesOut = runShellCommand('adb devices');
    
    // 디바이스 상태별 파싱
    const isUnauthorized = devicesOut.includes('unauthorized');
    const deviceLines = devicesOut.split('\n').map(l => l.trim()).filter(l => l.endsWith('device'));
    
    if (isUnauthorized && deviceLines.length === 0) {
      return res.status(401).json({ message: 'PC가 기기를 발견했지만, 태블릿 화면에서 [항상 허용] 팝업이 승인되지 않았습니다. 기기 화면을 켜고 확인을 눌러주세요.' });
    }

    if (deviceLines.length === 0) {
      return res.status(404).json({ message: 'PC와 연결된 안드로이드 기기(ADB)를 전혀 찾을 수 없습니다. 드라이버 미설치, 충전 전용 케이블, 혹은 디버깅 옵션 꺼짐이 원인입니다.' });
    }
    if (deviceLines.length > 1) {
      return res.status(400).json({ message: '2대 이상의 기기가 연결되어 있습니다. 오류 방지를 위해 1대만 꽂고 쾌속 세팅을 진행해주세요.' });
    }

    // 3. 기기 시리얼 및 모델명 추출
    const serialNumber = runShellCommand('adb get-serialno');
    if (!serialNumber) {
      throw new Error('기기의 시리얼 번호를 읽을 수 없습니다.');
    }
    
    // 모델명 추출 시도 (실패해도 무방)
    let modelName = 'Unknown Tablet';
    try {
      modelName = runShellCommand('adb shell getprop ro.product.model');
    } catch (e) {
      console.warn('모델명 가져오기 실패:', e.message);
    }

    console.log(`[+] 디바이스 스캔 완료: Serial[${serialNumber}] Model[${modelName}]`);

    // 4. API 서버로 등록 요청 (프론트에서 넘겨받은 JWT 릴레이)
    let createRes;
    try {
      createRes = await axios.post(`${apiUrl}/tablets`, {
        serialNumber: serialNumber,
        modelName: modelName,
        notes: '로컬 프로비저닝 에이전트를 통한 자동 등록 세팅'
      }, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
    } catch (apiError) {
      console.error('[!] API 요청 에러:', apiError.response ? apiError.response.data : apiError.message);
      throw new Error(`백엔드 서버 기기 등록 실패: ${apiError.response?.data?.error || apiError.message}`);
    }

    const qrCode = createRes.data.qr_code;
    if (!qrCode) {
      throw new Error('응답으로부터 발급된 qr_code를 찾을 수 없습니다.');
    }
    console.log(`[+] 클라우드 등록 성공: 생성된 식별코드 [${qrCode}]`);

    // 5. device.txt 파일 생성 및 ADB Push 주입
    const txtPath = path.join(__dirname, 'device.txt');
    fs.writeFileSync(txtPath, `device_id=${qrCode}\n`, 'utf-8');

    console.log(`[+] 파일 밀어넣기 실행 (adb push device.txt /sdcard/device.txt)...`);
    runShellCommand(`adb push "${txtPath}" /sdcard/device.txt`);
    
    // 임시 파일 삭제 여부 체크 (성공 시 지움)
    fs.unlinkSync(txtPath);

    console.log(`[PROVISION SUCCESS] ${qrCode} 주입이 완료되었습니다.`);

    res.json({ success: true, serialNumber, qr_code: qrCode });

  } catch (error) {
    console.error('[PROVISION ERROR] :', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('\n=============================================');
  console.log(`🚀 [LAS] Local Provisioning Agent Running`);
  console.log(` - Port           : http://127.0.0.1:${PORT}`);
  console.log(` - 웹(Admin) 프론트엔드와 브릿지 연동 대기중...`);
  console.log(` - 기기는 반드시 ADB 디버깅 옵션이 체크되어 있어야 합니다.`);
  console.log('=============================================\n');
});
