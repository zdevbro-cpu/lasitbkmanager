$envVars = Get-Content api/.env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $envVars) {
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        if ($key -like "FIREBASE_*") {
            Write-Host "Skipping reserved Firebase Key: $key"
            continue
        }
        Write-Host "Setting Firebase Secret: $key"
        echo "$val" | firebase functions:secrets:set "$key" --force --data-file -
    }
}
