@echo off
setlocal

net session >nul 2>nul
if errorlevel 1 (
  echo Solicitando permissao de administrador...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
  exit /b
)

set "SERVICE_NAME=Web Client Manaus"
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
set "APP_DIR=%BASE_DIR%"
set "APP_EXE=%BASE_DIR%\webclientmanaus.exe"
set "PORT=4000"
set "URL=http://localhost:%PORT%"
set "NSSM_EXE=%BASE_DIR%\nssm.exe"
set "SHORTCUT_NAME=webclient detect.url"

if not exist "%NSSM_EXE%" (
  echo NSSM nao encontrado em "%NSSM_EXE%".
  pause
  exit /b 1
)

if not exist "%APP_EXE%" (
  echo Executavel nao encontrado em "%APP_EXE%".
  pause
  exit /b 1
)

"%NSSM_EXE%" status "%SERVICE_NAME%" >nul 2>nul
if errorlevel 1 (
  echo Criando servico "%SERVICE_NAME%"...
  "%NSSM_EXE%" install "%SERVICE_NAME%" "%APP_EXE%"
  if errorlevel 1 (
    echo Falha ao criar o servico. Execute este arquivo como administrador.
    pause
    exit /b 1
  )
) else (
  echo Servico "%SERVICE_NAME%" ja existe. Atualizando configuracao...
)

"%NSSM_EXE%" set "%SERVICE_NAME%" Application "%APP_EXE%" >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppParameters "" >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppDirectory "%APP_DIR%" >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppEnvironmentExtra PORT=%PORT% >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStdout "%APP_DIR%\service-out.log" >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppStderr "%APP_DIR%\service-error.log" >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateFiles 1 >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateOnline 1 >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateSeconds 86400 >nul
"%NSSM_EXE%" set "%SERVICE_NAME%" AppRotateBytes 1048576 >nul

echo Iniciando servico "%SERVICE_NAME%"...
"%NSSM_EXE%" status "%SERVICE_NAME%" | find /I "SERVICE_RUNNING" >nul
if errorlevel 1 (
  "%NSSM_EXE%" start "%SERVICE_NAME%"
  if errorlevel 1 (
    "%NSSM_EXE%" status "%SERVICE_NAME%" | find /I "SERVICE_RUNNING" >nul
    if errorlevel 1 (
      echo Falha ao iniciar o servico.
      pause
      exit /b 1
    )
  )
) else (
  echo Servico ja esta em execucao.
)

echo Criando atalho na Area de Trabalho...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = '%URL%';" ^
  "$name = '%SHORTCUT_NAME%';" ^
  "$desktops = @([Environment]::GetFolderPath('CommonDesktopDirectory'), [Environment]::GetFolderPath('Desktop')) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique;" ^
  "foreach ($desktop in $desktops) {" ^
  "  $shortcut = Join-Path $desktop $name;" ^
  "  ('[InternetShortcut]' + [Environment]::NewLine + 'URL=' + $url) | Out-File -FilePath $shortcut -Encoding ASCII -Force;" ^
  "}"

echo Aguardando o sistema responder em %URL%...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = '%URL%';" ^
  "$deadline = (Get-Date).AddSeconds(30);" ^
  "do {" ^
  "  try {" ^
  "    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2;" ^
  "    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {" ^
  "      Start-Process $url;" ^
  "      exit 0;" ^
  "    }" ^
  "  } catch {" ^
  "    Start-Sleep -Milliseconds 500;" ^
  "  }" ^
  "} while ((Get-Date) -lt $deadline);" ^
  "exit 1"

if errorlevel 1 (
  echo Nao foi possivel abrir %URL%.
  echo Verifique se o servico iniciou corretamente e se a porta %PORT% esta liberada.
  pause
  exit /b 1
)

echo Sistema iniciado: %URL%
endlocal
