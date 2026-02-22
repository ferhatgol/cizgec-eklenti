Add-Type -AssemblyName System.Drawing

function Convert-ToGrayscale {
    param([string]$InputPath, [string]$OutputPath)
    $original = [System.Drawing.Image]::FromFile($InputPath)
    $bmp = New-Object System.Drawing.Bitmap($original.Width, $original.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $colorMatrix = New-Object System.Drawing.Imaging.ColorMatrix
    $colorMatrix.Matrix00 = $colorMatrix.Matrix01 = $colorMatrix.Matrix02 = 0.299
    $colorMatrix.Matrix10 = $colorMatrix.Matrix11 = $colorMatrix.Matrix12 = 0.587
    $colorMatrix.Matrix20 = $colorMatrix.Matrix21 = $colorMatrix.Matrix22 = 0.114
    
    $attributes = New-Object System.Drawing.Imaging.ImageAttributes
    $attributes.SetColorMatrix($colorMatrix)
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $original.Width, $original.Height)
    $g.DrawImage($original, $rect, 0, 0, $original.Width, $original.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
    
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $original.Dispose()
}

$dest = "c:\Users\x\Desktop\eklenti\icons"
Get-ChildItem -Path $dest -Filter "icon*.png" | ForEach-Object {
    if ($_.Name -notlike "*_gray*") {
        $grayPath = Join-Path $dest ($_.BaseName + "_gray" + $_.Extension)
        Convert-ToGrayscale -InputPath $_.FullName -OutputPath $grayPath
    }
}
