Add-Type -AssemblyName System.Drawing
$files = @("assets\icon.png","assets\splash.png","assets\adaptive-icon.png")
foreach ($f in $files) {
  $p = Join-Path (Get-Location) $f
  if (Test-Path $p) {
    $img = [System.Drawing.Image]::FromFile($p)
    $bmp = New-Object System.Drawing.Bitmap $img
    $img.Dispose()
    $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Converted: $f"
  } else {
    Write-Host "Not found: $f"
  }
}
Write-Host "All done."
