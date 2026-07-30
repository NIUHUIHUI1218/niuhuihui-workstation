# 牛慧慧工作台 - GitHub 一键部署 (PowerShell版)
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  牛慧慧专属一体化工作台 - 一键部署" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$githubUser = Read-Host "请输入你的 GitHub 用户名"
$githubToken = Read-Host "请输入 GitHub Personal Access Token"

Write-Host ""
Write-Host "[1/4] 创建 GitHub 仓库..." -ForegroundColor Yellow
try {
    $body = @{name="niuhuihui-workstation"; private=$false; auto_init=$false} | ConvertTo-Json
    $headers = @{Authorization="Basic "+[Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${githubUser}:${githubToken}"))}
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body | Out-Null
    Write-Host "  仓库创建成功" -ForegroundColor Green
} catch {
    Write-Host "  仓库可能已存在，继续推送..." -ForegroundColor Yellow
}

Write-Host "[2/4] 推送代码到 GitHub..." -ForegroundColor Yellow
$repoUrl = "https://${githubUser}:${githubToken}@github.com/${githubUser}/niuhuihui-workstation.git"
git remote remove origin 2>$null
git remote add origin $repoUrl
git push -u origin main --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "推送失败！请检查用户名和 Token。" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}
Write-Host "  代码推送成功" -ForegroundColor Green

Write-Host "[3/4] 开启 GitHub Pages..." -ForegroundColor Yellow
try {
    $pagesBody = @{source=@{branch="main"; path="/"}} | ConvertTo-Json
    Invoke-RestMethod -Uri "https://api.github.com/repos/${githubUser}/niuhuihui-workstation/pages" -Method Put -Headers $headers -Body $pagesBody | Out-Null
    Write-Host "  Pages 已开启" -ForegroundColor Green
} catch {
    Write-Host "  Pages 开启中（如已开启可忽略）" -ForegroundColor Yellow
}

Write-Host "[4/4] 等待 Pages 部署生效..." -ForegroundColor Yellow
$maxWait = 30
for ($i=0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 2
    Write-Host "  ." -NoNewline
    try {
        $status = Invoke-RestMethod -Uri "https://api.github.com/repos/${githubUser}/niuhuihui-workstation/pages" -Headers $headers
        if ($status.status -eq "built") {
            break
        }
    } catch {}
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  部署成功！" -ForegroundColor Green
Write-Host "  访问链接: https://${githubUser}.github.io/niuhuihui-workstation/" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub Actions 定时抓取已自动启用。"
Write-Host "数据同步：在工作台设置中填入相同 Token 即可开启双端同步。"
Read-Host "按回车退出"
