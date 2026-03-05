@echo off
chcp 65001 >nul 2>&1

:: PDF 뷰어를 Edge 앱 모드로 실행
:: 공유 폴더에서 바로 더블클릭하면 됩니다

set "SCRIPT_DIR=%~dp0"
set "HTML_PATH=%SCRIPT_DIR%index.html"

:: file:// URL 생성 (백슬래시→슬래시)
set "FILE_URL=file:///%HTML_PATH:\=/%"

:: Edge가 있으면 앱 모드로 열기, 없으면 Chrome, 없으면 기본 브라우저
where msedge >nul 2>&1
if %errorlevel%==0 (
    start "" "msedge" --app="%FILE_URL%" --window-size=1200,800
    goto :eof
)

where chrome >nul 2>&1
if %errorlevel%==0 (
    start "" "chrome" --app="%FILE_URL%" --window-size=1200,800
    goto :eof
)

:: 기본 브라우저로 열기
start "" "%HTML_PATH%"
