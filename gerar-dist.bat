@echo off
setlocal

set "BASE_DIR=%~dp0"
set "PLATAFORMA_DIR=%BASE_DIR%plataforma"
set "ROOT_DIST_DIR=%BASE_DIR%dist"
set "APP_EXE=%PLATAFORMA_DIR%\dist\webclientmanaus.exe"

if not exist "%BASE_DIR%nssm.exe" (
  echo Arquivo nao encontrado: "%BASE_DIR%nssm.exe"
  exit /b 1
)

if not exist "%PLATAFORMA_DIR%\package.json" (
  echo Arquivo nao encontrado: "%PLATAFORMA_DIR%\package.json"
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd nao encontrado. Esta etapa precisa ser executada na maquina de desenvolvimento com Node instalado.
  exit /b 1
)

echo Gerando executavel do servidor...
pushd "%PLATAFORMA_DIR%"
call npm.cmd run build:exe
set "BUILD_EXIT=%ERRORLEVEL%"
popd

if not "%BUILD_EXIT%"=="0" (
  echo Falha ao gerar o executavel.
  exit /b %BUILD_EXIT%
)

if not exist "%APP_EXE%" (
  echo Executavel nao foi encontrado apos o build: "%APP_EXE%"
  exit /b 1
)

if not exist "%ROOT_DIST_DIR%" (
  mkdir "%ROOT_DIST_DIR%"
  if errorlevel 1 exit /b 1
)

if exist "%ROOT_DIST_DIR%\nssm.exe" (
  "%ROOT_DIST_DIR%\nssm.exe" stop "Web Client Manaus" >nul 2>nul
)

del /F /Q "%ROOT_DIST_DIR%\webclientmanaus.exe" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\nssm.exe" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\start-webclient.bat" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\remove-webclient.bat" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\start-playwright-api-service.bat" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\remove-playwright-api-service.bat" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\abrir-sistema.bat" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\parar-sistema.bat" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\service-out.log" >nul 2>nul
del /F /Q "%ROOT_DIST_DIR%\service-error.log" >nul 2>nul

echo Copiando arquivos para "%ROOT_DIST_DIR%"...
copy /Y "%APP_EXE%" "%ROOT_DIST_DIR%\webclientmanaus.exe" >nul
if errorlevel 1 exit /b 1

copy /Y "%BASE_DIR%nssm.exe" "%ROOT_DIST_DIR%\nssm.exe" >nul
if errorlevel 1 exit /b 1

copy /Y "%BASE_DIR%start-webclient.bat" "%ROOT_DIST_DIR%\start-webclient.bat" >nul
if errorlevel 1 exit /b 1

copy /Y "%BASE_DIR%remove-webclient.bat" "%ROOT_DIST_DIR%\remove-webclient.bat" >nul
if errorlevel 1 exit /b 1

echo.
echo Dist gerada com sucesso:
echo "%ROOT_DIST_DIR%"
echo.
echo Envie esta pasta para o cliente. Ela nao precisa de node_modules.
echo Para iniciar, execute start-webclient.bat e aceite a permissao de administrador.

endlocal
