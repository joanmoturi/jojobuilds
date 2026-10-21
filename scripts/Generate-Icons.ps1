$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assets = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\apps\mobile\assets'))

function New-BrandIcon {
    param(
        [string]$Name,
        [int]$Size = 1024,
        [switch]$Transparent,
        [switch]$Monochrome,
        [switch]$BackgroundOnly
    )
    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $gold = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#c5a77b'))
    $terra = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#a44f36'))
    $ivory = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e9e2cf'))
    try {
        $background = if ($Transparent) {
            [System.Drawing.Color]::Transparent
        } else {
            [System.Drawing.ColorTranslator]::FromHtml('#132535')
        }
        $graphics.Clear($background)
        if (-not $BackgroundOnly) {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.ScaleTransform(($Size / 64.0), ($Size / 64.0))
            $path.AddLine(22, 15, 46, 15)
            $path.AddLine(46, 15, 46, 22)
            $path.AddLine(46, 22, 30, 22)
            $path.AddLine(30, 22, 30, 42)
            $path.AddBezier(30, 42, 30, 50, 25, 54, 18, 54)
            $path.AddLine(18, 54, 18, 46)
            $path.AddBezier(18, 46, 21, 46, 22, 44, 22, 41)
            $path.CloseFigure()
            if ($Monochrome) {
                $graphics.FillPath([System.Drawing.Brushes]::White, $path)
                $graphics.FillRectangle([System.Drawing.Brushes]::White, 37, 30, 8, 8)
                $graphics.FillRectangle([System.Drawing.Brushes]::White, 37, 42, 8, 8)
            } else {
                $graphics.FillPath($gold, $path)
                $graphics.FillRectangle($terra, 37, 30, 8, 8)
                $graphics.FillRectangle($ivory, 37, 42, 8, 8)
            }
        }
        $bitmap.Save((Join-Path $assets $Name), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $ivory.Dispose()
        $terra.Dispose()
        $gold.Dispose()
        $path.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-BrandIcon -Name 'icon.png'
New-BrandIcon -Name 'favicon.png' -Size 64
New-BrandIcon -Name 'android-icon-foreground.png' -Transparent
New-BrandIcon -Name 'android-icon-background.png' -BackgroundOnly
New-BrandIcon -Name 'android-icon-monochrome.png' -Transparent -Monochrome
