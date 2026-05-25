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
set "NSSM_EXE=%BASE_DIR%\nssm.exe"
set "SHORTCUT_NAME=webclient detect.url"

if not exist "%NSSM_EXE%" (
  echo NSSM nao encontrado em "%NSSM_EXE%".
  pause
  exit /b 1
)

"%NSSM_EXE%" status "%SERVICE_NAME%" >nul 2>nul
if errorlevel 1 (
  echo Servico "%SERVICE_NAME%" nao existe.
) else (
  echo Parando servico "%SERVICE_NAME%"...
  "%NSSM_EXE%" stop "%SERVICE_NAME%" >nul 2>nul

  echo Removendo servico "%SERVICE_NAME%"...
  "%NSSM_EXE%" remove "%SERVICE_NAME%" confirm
  if errorlevel 1 (
    echo Falha ao remover o servico. Execute este arquivo como administrador.
    pause
    exit /b 1
  )
)

echo Removendo atalho da Area de Trabalho...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$name = '%SHORTCUT_NAME%';" ^
  "$desktops = @([Environment]::GetFolderPath('CommonDesktopDirectory'), [Environment]::GetFolderPath('Desktop')) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique;" ^
  "foreach ($desktop in $desktops) {" ^
  "  $shortcut = Join-Path $desktop $name;" ^
  "  if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force }" ^
  "}"

echo Web Client removido.
endlocal
