Add-Type -AssemblyName System.Drawing

function New-Icon {
    param([int]$Size, [string]$Path)
    
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Background Circle
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 52, 152, 219), [System.Drawing.Color]::FromArgb(255, 142, 68, 173), 45)
    $g.FillEllipse($brush, 0, 0, $Size, $Size)
    
    # Simple White Square in the middle for now to ensure it works
    $innerSize = $Size * 0.4
    $offset = ($Size - $innerSize) / 2
    $g.FillRectangle([System.Drawing.Brushes]::White, $offset, $offset, $innerSize, $innerSize)
    
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$dest = "c:\Users\x\Desktop\eklenti\icons"
if (!(Test-Path $dest)) { New-Item -ItemType Directory -Path $dest }

New-Icon -Size 128 -Path "$dest\icon128.png"
New-Icon -Size 48 -Path "$dest\icon48.png"
New-Icon -Size 32 -Path "$dest\icon32.png"
New-Icon -Size 16 -Path "$dest\icon16.png"
