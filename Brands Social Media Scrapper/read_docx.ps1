Add-Type -AssemblyName System.IO.Compression.FileSystem
$docxPath = "c:\Users\Cyanide 666\Downloads\Dev\Brands Social Media Scrapper\competitor_social_scraper_PRD.docx"
$outputPath = "c:\Users\Cyanide 666\Downloads\Dev\Brands Social Media Scrapper\prd_text.txt"
$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xmlContent = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$ns = New-Object System.Xml.XmlNamespaceManager(New-Object System.Xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

[xml]$doc = $xmlContent
$paragraphs = $doc.SelectNodes("//w:p", $ns)
$result = @()
foreach ($p in $paragraphs) {
    $runs = $p.SelectNodes(".//w:r/w:t", $ns)
    $text = ""
    foreach ($r in $runs) {
        $text += $r.InnerText
    }
    if ($text.Trim() -ne "") {
        $result += $text
    }
}
$result -join "`n" | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "Done. Paragraphs: $($result.Count)"
