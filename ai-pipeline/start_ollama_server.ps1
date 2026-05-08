# Windows용 Ollama LLM 서버 시작 스크립트
# 실행: powershell -ExecutionPolicy Bypass -File start_ollama_server.ps1

$model = if ($env:LLM_MODEL) { $env:LLM_MODEL } else { "llama3.1:8b" }

Write-Host "Ollama LLM 서버 시작 중..."
Write-Host "모델: $model"

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Ollama가 설치되지 않았습니다."
    Write-Host "https://ollama.com 에서 설치 후 재시도하세요."
    exit 1
}

Write-Host "모델 확인 중: $model"
$models = ollama list 2>&1
if ($models -notmatch [regex]::Escape($model.Split(":")[0])) {
    Write-Host "모델 다운로드 중 (~4GB)..."
    ollama pull $model
}

Write-Host "Ollama 서버 실행 중 (포트 11434)..."
ollama serve
