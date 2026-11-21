# Fixturile îndreptării scanărilor (ADR 0271): pagini desenate cu GDI+ și rotite tot de GDI+ (interpolarea bicubică), cu
# unghiuri știute, deci unghiul găsit de aplicație se compară cu o rotire făcută de alt program. Numele spune unghiul, în
# convenția ADR-ului (pozitiv: desenul rotit în sens invers acelor de ceasornic pe ecran; „m” e minus): `desen-p1.7.png`
# e rotit cu +1,7°. Rulare (Windows PowerShell 5.1), din dosarul ăsta:
# `powershell -NoProfile -ExecutionPolicy Bypass -File genereaza.ps1`.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Set-Location -LiteralPath $PSScriptRoot

$Negru = [System.Drawing.Color]::Black
$PF = [System.Drawing.Imaging.PixelFormat]

function Pana([double]$g) { return New-Object System.Drawing.Pen $Negru, ([float]$g) }

# Un desen tehnic de 1000 × 700 px: chenarul, indicatorul cu text, trei piese (dreptunghiuri cu găuri), cotele lor (linii
# subțiri cu semnele capetelor), o linie oblică la 30° și etichete.
function Desen() {
  $b = New-Object System.Drawing.Bitmap 1000, 700, ($PF::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawRectangle((Pana 3), 30, 30, 940, 640)
  $g.DrawRectangle((Pana 2), 600, 560, 370, 110)
  $g.DrawLine((Pana 2), 600, 600, 970, 600)
  $g.DrawLine((Pana 2), 780, 600, 780, 670)
  $f = New-Object System.Drawing.Font 'Arial', 16, ([System.Drawing.FontStyle]::Bold)
  $fm = New-Object System.Drawing.Font 'Arial', 11
  $p = New-Object System.Drawing.SolidBrush $Negru
  $g.DrawString('CNC VECTOR STUDIO', $f, $p, 615, 568)
  $g.DrawString('SCARA 1:1', $fm, $p, 615, 620)
  $g.DrawString('PLACA 18 MM', $fm, $p, 795, 620)
  foreach ($r in @(@(90, 120, 260, 160), @(420, 100, 300, 220), @(110, 380, 360, 140))) {
    $x = $r[0]; $y = $r[1]; $w = $r[2]; $h = $r[3]
    $g.DrawRectangle((Pana 2.5), $x, $y, $w, $h)
    $d = [Math]::Min($w, $h) / 3
    $g.DrawEllipse((Pana 2), ($x + $w / 2 - $d / 2), ($y + $h / 2 - $d / 2), $d, $d)
    $g.DrawLine((Pana 1), $x, ($y - 25), ($x + $w), ($y - 25))
    $g.DrawLine((Pana 1), $x, ($y - 35), $x, ($y - 15))
    $g.DrawLine((Pana 1), ($x + $w), ($y - 35), ($x + $w), ($y - 15))
    $g.DrawString("$w", $fm, $p, ($x + $w / 2 - 12), ($y - 45))
  }
  $g.DrawLine((Pana 2), 520, 520, 700, 416)
  $g.DrawString('DETALIU A', $fm, $p, 90, 560)
  $g.Dispose()
  return $b
}

# O pagină de text de 800 × 1100 px: paragrafe la stânga, Arial 12, cu rânduri de lungimi diferite.
function Text() {
  $b = New-Object System.Drawing.Bitmap 800, 1100, ($PF::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::White)
  $f = New-Object System.Drawing.Font 'Arial', 12
  $p = New-Object System.Drawing.SolidBrush $Negru
  $randuri = @(
    'Placa se prinde pe masa masinii cu patru cleme, departe de traseele frezei.',
    'Freza de 6 mm taie conturul exterior in trei treceri, cate 6 mm fiecare.',
    'Gaurile se fac inaintea conturului, ca piesa sa nu se miste.',
    'Urechile tin piesa in placa pana la ultima trecere.',
    'Dupa taiere, marginile se slefuiesc cu hartie de 120.',
    'Desenul se verifica pe foaie inainte de a porni masina.'
  )
  $y = 80
  for ($k = 0; $k -lt 5; $k++) {
    foreach ($r in $randuri) {
      $t = if (($k + $r.Length) % 3 -eq 0) { $r.Substring(0, [Math]::Min($r.Length, 48)) } else { $r }
      $g.DrawString($t, $f, $p, 70, $y)
      $y += 26
    }
    $y += 26
  }
  $g.Dispose()
  return $b
}

# Imaginea rotită în jurul centrului cu `unghi` grade în sensul ADR-ului (GDI+ rotește în sensul acelor: −unghi), pe alb.
function Roteste($src, [double]$unghi) {
  $W = $src.Width; $H = $src.Height
  $b = New-Object System.Drawing.Bitmap $W, $H, ($PF::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TranslateTransform(($W / 2), ($H / 2))
  $g.RotateTransform(-$unghi)
  $g.TranslateTransform((-$W / 2), (-$H / 2))
  $g.DrawImage($src, 0, 0, $W, $H)
  $g.Dispose()
  return $b
}

function Png($bmp, [string]$nume) { $bmp.Save((Join-Path $PSScriptRoot $nume), [System.Drawing.Imaging.ImageFormat]::Png) }

$desen = Desen
$text = Text
Png (Roteste $desen 1.7) 'desen-p1.7.png'
Png (Roteste $desen -6.5) 'desen-m6.5.png'
Png (Roteste $text -3.2) 'text-m3.2.png'
Png $desen 'desen-p0.png'

# Alb-negru, ca de la un scaner de birou: desenul rotit cu −0,6°, cu pragul GDI+ la 1 bit, scris CCITT G4.
$r = Roteste $desen -0.6
$bw = $r.Clone((New-Object System.Drawing.Rectangle 0, 0, $r.Width, $r.Height), $PF::Format1bppIndexed)
$codor = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/tiff' }
$pr = New-Object System.Drawing.Imaging.EncoderParameters 1
$pr.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Compression), ([long][System.Drawing.Imaging.EncoderValue]::CompressionCCITT4.value__)
$bw.Save((Join-Path $PSScriptRoot 'desen-g4-m0.6.tif'), $codor, $pr)
'gata'
