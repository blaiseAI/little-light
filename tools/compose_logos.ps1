Add-Type -AssemblyName System.Drawing
$brandRoot = Join-Path $PSScriptRoot '../assets/brand'
$familyCollection = New-Object System.Drawing.Text.PrivateFontCollection
$familyCollection.AddFontFile((Join-Path $brandRoot 'fonts/Fredoka-SemiBold.ttf'))
$family = $familyCollection.Families[0]
$wordFont = New-Object System.Drawing.Font($family, 152, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#2b2250'))
foreach ($name in @('01-little-lantern','02-story-star','03-little-spark')) {
  $source = [System.Drawing.Bitmap]::FromFile((Join-Path $brandRoot "concepts/$name-icon.png"))
  $left=$source.Width; $top=$source.Height; $right=0; $bottom=0
  for ($y=0;$y -lt $source.Height;$y++) { for ($x=0;$x -lt $source.Width;$x++) {
    if ($source.GetPixel($x,$y).A -gt 20) {
      if($x -lt $left){$left=$x}; if($x -gt $right){$right=$x}
      if($y -lt $top){$top=$y}; if($y -gt $bottom){$bottom=$y}
    }
  }}
  $bounds=New-Object System.Drawing.Rectangle($left,$top,($right-$left+1),($bottom-$top+1))
  $canvas=New-Object System.Drawing.Bitmap(1440,520,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[System.Drawing.Graphics]::FromImage($canvas); $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $scale=[Math]::Min(320/$bounds.Width,350/$bounds.Height)
  $w=[single]($bounds.Width*$scale); $h=[single]($bounds.Height*$scale)
  $dest=New-Object System.Drawing.RectangleF([single](80+(320-$w)/2),[single]((520-$h)/2),$w,$h)
  $g.DrawImage($source,$dest,$bounds,[System.Drawing.GraphicsUnit]::Pixel)
  $format=[System.Drawing.StringFormat]::GenericTypographic.Clone()
  $size=$g.MeasureString('little light',$wordFont,1000,$format)
  $g.DrawString('little light',$wordFont,$brush,[single]450,[single]((520-$size.Height)/2),$format)
  $canvas.Save((Join-Path $brandRoot "concepts/$name-logo.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose();$g.Dispose();$canvas.Dispose();$source.Dispose()
  Write-Output "$name-logo.png exported"
}
$brush.Dispose();$wordFont.Dispose();$familyCollection.Dispose()
