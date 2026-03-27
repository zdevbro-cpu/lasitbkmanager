$ErrorActionPreference = "Stop"
$url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
$zipPath = "$env:TEMP\platform-tools.zip"
$extractPath = "$env:USERPROFILE"
$adbPath = "$env:USERPROFILE\platform-tools"

Write-Host "ADB 다운로드 중: $url..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "압축 해제 위치: $extractPath..."
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "사용자 환경변수(PATH)에 등록 중..."
$oldUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($oldUserPath -notmatch [regex]::Escape($adbPath)) {
    $newUserPath = $oldUserPath + ";" + $adbPath
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    Write-Host "✅ Path 등록 완료."
} else {
    Write-Host "✅ Path에 이미 등록되어 있습니다."
}

Write-Host "임시 파일 정리..."
Remove-Item $zipPath

Write-Host "🎉 설치 완료! ADB 경로: $adbPath"
