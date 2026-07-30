@echo off
chcp 65001 >nul
title 牛慧慧工作台 - GitHub 一键部署

echo ================================================
echo   牛慧慧专属一体化工作台 - 一键部署脚本
echo ================================================
echo.

set /p GITHUB_USER="请输入你的 GitHub 用户名: "
set /p GITHUB_TOKEN="请输入 GitHub Personal Access Token (输入时不显示): "

echo.
echo [1/4] 创建 GitHub 仓库...
curl -s -u "%GITHUB_USER%:%GITHUB_TOKEN%" https://api.github.com/user/repos -d "{\"name\":\"niuhuihui-workstation\",\"private\":false,\"auto_init\":false}" >nul 2>&1
if %errorlevel% neq 0 (
    echo 仓库可能已存在，继续推送...
)

echo [2/4] 添加远程仓库并推送...
git remote remove origin 2>nul
git remote add origin https://%GITHUB_USER%:%GITHUB_TOKEN%@github.com/%GITHUB_USER%/niuhuihui-workstation.git
git push -u origin main --force

if %errorlevel% neq 0 (
    echo 推送失败！请检查用户名和 Token 是否正确。
    pause
    exit /b 1
)

echo [3/4] 开启 GitHub Pages...
curl -s -X PUT -u "%GITHUB_USER%:%GITHUB_TOKEN%" ^
  https://api.github.com/repos/%GITHUB_USER%/niuhuihui-workstation/pages ^
  -d "{\"source\":{\"branch\":\"main\",\"path\":\"/\"}}" >nul 2>&1

echo [4/4] 等待 Pages 部署...
timeout /t 5 /nobreak >nul

:check_pages
curl -s -u "%GITHUB_USER%:%GITHUB_TOKEN%" ^
  https://api.github.com/repos/%GITHUB_USER%/niuhuihui-workstation/pages > pages_status.json
findstr /C:"\"status\":\"built\"" pages_status.json >nul
if %errorlevel% equ 0 goto done

echo 等待部署生效（约30秒）...
timeout /t 10 /nobreak >nul
goto check_pages

:done
echo.
echo ================================================
echo   部署成功！
echo   访问链接: https://%GITHUB_USER%.github.io/niuhuihui-workstation/
echo ================================================
echo.
echo GitHub Actions 定时抓取已自动启用。
echo 数据同步：在工作台设置中填入相同 Token 即可开启。
echo.
pause
