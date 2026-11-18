# Fixturile TIFF ale probelor (ADR 0229): scrise de codoarele Windows (WIC, din WPF, și GDI+), fiecare cu pixelii lui citiți
# tot de WIC (un decodor independent de cel al aplicației), într-un PNG RGBA de 8 biți alături (`<nume>.png`, câte unul pe
# pagină: `<nume>.p2.png` pentru a doua). Rulare (Windows PowerShell 5.1), din dosarul ăsta:
# `powershell -NoProfile -ExecutionPolicy Bypass -File genereaza.ps1`.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName PresentationCore, WindowsBase
Set-Location -LiteralPath $PSScriptRoot

# Desenul: 240 × 160, hârtie albă; un cerc, un dreptunghi plin, linii oblice și un text (alb-negru), sau aceleași forme
# colorate și o bandă cu treptele de gri (color).
function Desen([bool]$color) {
  $b = New-Object System.Drawing.Bitmap 240, 160, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $g.Clear([System.Drawing.Color]::White)
  $negru = [System.Drawing.Color]::Black
  $c1 = if ($color) { [System.Drawing.Color]::FromArgb(196, 38, 42) } else { $negru }
  $c2 = if ($color) { [System.Drawing.Color]::FromArgb(38, 72, 186) } else { $negru }
  $c3 = if ($color) { [System.Drawing.Color]::FromArgb(44, 146, 70) } else { $negru }
  $g.DrawEllipse((New-Object System.Drawing.Pen $c1, 5), 20, 20, 90, 90)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush $c2), 130, 25, 80, 50)
  $g.DrawLine((New-Object System.Drawing.Pen $c3, 3), 125, 140, 230, 95)
  $g.DrawLine((New-Object System.Drawing.Pen $negru, 1), 10, 150, 110, 128)
  $f = New-Object System.Drawing.Font 'Arial', 20, ([System.Drawing.FontStyle]::Bold)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit
  $g.DrawString('CVS', $f, (New-Object System.Drawing.SolidBrush $negru), 135, 100)
  if ($color) { for ($i = 0; $i -lt 16; $i++) { $v = 255 - 16 * $i; $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($v, $v, $v))), 5 + 14 * $i, 2, 14, 12) } }
  $g.Dispose()
  return $b
}

# Bitmap-ul GDI+ ca sursă WPF (prin PNG, fără pierderi).
function SursaWpf($bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $ms.Position = 0
  $d = New-Object System.Windows.Media.Imaging.PngBitmapDecoder $ms, ([System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat), ([System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
  return $d.Frames[0]
}

function Converteste($src, $fmt, $paleta) {
  $c = New-Object System.Windows.Media.Imaging.FormatConvertedBitmap
  $c.BeginInit(); $c.Source = $src; $c.DestinationFormat = $fmt
  if ($paleta) { $c.DestinationPalette = $paleta }
  $c.EndInit()
  return $c
}

# Pixelii fiecărei pagini a unui TIFF, citiți de WIC, într-un PNG RGBA de 8 biți (fără pierderi, fără întrețesere).
function Referinta([string]$nume) {
  $fs = [System.IO.File]::OpenRead((Join-Path $PSScriptRoot "$nume.tif"))
  try {
    $d = New-Object System.Windows.Media.Imaging.TiffBitmapDecoder $fs, ([System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat), ([System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
    for ($p = 0; $p -lt $d.Frames.Count; $p++) {
      $b = Converteste $d.Frames[$p] ([System.Windows.Media.PixelFormats]::Bgra32) $null
      $e = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
      $e.Interlace = [System.Windows.Media.Imaging.PngInterlaceOption]::Off
      $e.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($b))
      $sufix = if ($p -eq 0) { '' } else { ".p$($p + 1)" }
      $o = [System.IO.File]::Create((Join-Path $PSScriptRoot "$nume$sufix.png"))
      $e.Save($o); $o.Close()
    }
  } finally { $fs.Close() }
}

function Wic([string]$nume, $cadre, [string]$compresie) {
  $e = New-Object System.Windows.Media.Imaging.TiffBitmapEncoder
  $e.Compression = [System.Windows.Media.Imaging.TiffCompressOption]::$compresie
  foreach ($c in $cadre) { $e.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($c)) }
  $o = [System.IO.File]::Create((Join-Path $PSScriptRoot "$nume.tif"))
  $e.Save($o); $o.Close()
  Referinta $nume
}

function Gdi([string]$nume, $bmp, $valoare) {
  $codor = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/tiff' }
  $p = New-Object System.Drawing.Imaging.EncoderParameters 1
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Compression), ([long]$valoare)
  $bmp.Save((Join-Path $PSScriptRoot "$nume.tif"), $codor, $p)
  Referinta $nume
}

# Desenul lat: 2600 × 24, alb-negru, cu benzi negre de lungimi alese pe fiecare rând (rândurile 2k și 2k + 1 la fel), ca
# trecerile lungi (peste 64, 1728, 1792 și 2560 de pixeli) să ceară codurile de completare, și cele extinse.
function DesenLat() {
  $b = New-Object System.Drawing.Bitmap 2600, 24, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.Clear([System.Drawing.Color]::White)
  $n = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
  # Câte trei numere: rândul (din 12), începutul și lungimea benzii; rândul 0 rămâne alb.
  $benzi = @(1, 0, 2600, 2, 5, 70, 2, 200, 130, 2, 400, 600, 3, 10, 1700, 3, 1800, 700, 4, 0, 1800, 4, 1850, 2, 5, 30, 2000,
    6, 1, 2550, 6, 2560, 40, 7, 100, 64, 7, 300, 1728, 7, 2100, 1, 8, 2599, 1, 9, 0, 1, 9, 2, 2560, 10, 700, 1856, 11, 64, 2496)
  for ($i = 0; $i -lt $benzi.Length; $i += 3) { $g.FillRectangle($n, [int]$benzi[$i + 1], 2 * [int]$benzi[$i], [int]$benzi[$i + 2], 2) }
  $g.Dispose()
  return $b
}

$lat = SursaWpf (DesenLat)
$latBw = Converteste $lat ([System.Windows.Media.PixelFormats]::BlackWhite) $null
Wic 'wic-lat-g4' @($latBw) 'Ccitt4'
Wic 'wic-lat-g3' @($latBw) 'Ccitt3'

$bw = Desen $false
$col = Desen $true
$sbw = SursaWpf $bw
$scol = SursaWpf $col
$PF = [System.Windows.Media.PixelFormats]
$alb = Converteste $sbw $PF::BlackWhite $null
$gri = Converteste $scol $PF::Gray8 $null
$gri16 = Converteste $scol $PF::Gray16 $null
$rgb = Converteste $scol $PF::Bgr24 $null
$rgba = Converteste $scol $PF::Bgra32 $null
$pal = New-Object System.Windows.Media.Imaging.BitmapPalette $scol, 16
$indexat = Converteste $scol $PF::Indexed8 $pal

Wic 'wic-g4' @($alb) 'Ccitt4'
Wic 'wic-g3' @($alb) 'Ccitt3'
Wic 'wic-rle' @($alb) 'Rle'
Wic 'wic-necomprimat-bw' @($alb) 'None'
Wic 'wic-lzw-gri' @($gri) 'Lzw'
Wic 'wic-lzw-rgb' @($rgb) 'Lzw'
Wic 'wic-zip-rgba' @($rgba) 'Zip'
Wic 'wic-zip-gri16' @($gri16) 'Zip'
Wic 'wic-lzw-paleta' @($indexat) 'Lzw'
Wic 'wic-pagini-g4' @($alb, (Converteste $scol $PF::BlackWhite $null)) 'Ccitt4'

$r = New-Object System.Drawing.Rectangle 0, 0, $bw.Width, $bw.Height
$bw1 = $bw.Clone($r, [System.Drawing.Imaging.PixelFormat]::Format1bppIndexed)
$EV = [System.Drawing.Imaging.EncoderValue]
Gdi 'gdi-g4' $bw1 $EV::CompressionCCITT4.value__
Gdi 'gdi-g3' $bw1 $EV::CompressionCCITT3.value__
Gdi 'gdi-rle' $bw1 $EV::CompressionRle.value__
Gdi 'gdi-lzw-rgb' $col $EV::CompressionLZW.value__
'gata'
