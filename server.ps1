# Tiny PowerShell Web Server for Local Preview
# Run this script using: powershell -File server.ps1
# Press Ctrl+C in the terminal to stop the server.

$port = 8080
$localPath = Get-Item $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

Write-Host "=============================================" -ForegroundColor Green
Write-Host " Starting local web server..." -ForegroundColor Green
Write-Host " URL: http://localhost:$port/" -ForegroundColor Cyan
Write-Host " Document Root: $localPath" -ForegroundColor DarkGray
Write-Host " Press Ctrl+C in this terminal to stop." -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Green

try {
    $listener.Start()
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $url = $request.Url.LocalPath
            if ($url -eq "/") { $url = "/index.html" }
            
            # Resolve physical path
            $filePath = Join-Path $localPath $url.Replace("/", "\")
            
            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                
                # Content type mapping
                $contentType = switch ($extension) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".png"  { "image/png" }
                    ".pdf"  { "application/pdf" }
                    ".svg"  { "image/svg+xml" }
                    default { "application/octet-stream" }
                }
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errorMessage = "404 Not Found: $url"
                $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorMessage)
                $response.ContentType = "text/plain"
                $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
                Write-Host "404 Not Found: $url" -ForegroundColor Red
            }
            $response.Close()
        } catch {
            Write-Host "Request error: $_" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Server failed to start or stopped: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
