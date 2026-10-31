# get-pse-history.ps1
# Downloads daily closing prices from PSE EDGE and saves them in the
# "date;marketPrice" format that Ghostfolio's market data import accepts, then
# updates those prices in Ghostfolio's database. Existing dates are overwritten
# with the latest values; no other data is touched.
#
# HOW TO USE
# 1. Fill in the cmpy_id for each ticker below. Find it on edge.pse.com.ph:
#    search the company, open it, and copy the number after "cmpy_id=" in the address bar.
#    Tickers left at 0 are skipped.
# 2. Right-click this file > "Run with PowerShell"
#    (or in a terminal:  powershell -ExecutionPolicy Bypass -File .\get-pse-history.ps1)
# 3. Files appear in a "pse-history" folder next to this script, one per ticker.
#    Ghostfolio must be running for the database update (see START-GHOSTFOLIO.md).
#
# You normally don't need this: the pse-sync container (docker/pse-sync.sh) updates
# prices whenever Ghostfolio starts. Use this script to also get the text files.
# Runs are logged to pse-history\sync.log.

$Companies = [ordered]@{
    "AC"    = 57
    "AREIT" = 679
    "CNPF"  = 652
    "CNVRG" = 680
    "CREIT" = 691
    "DDMPR" = 681
    "DNL"   = 639
    "FILRT" = 683
    "JFC"   = 86
    "MBT"   = 128
    "MER"   = 118
    "MONDE" = 682
    "OGP"   = 704
    "PGOLD" = 629
    "RCR"   = 684
    "SGP"   = 166
    "SMC"   = 154
    "URC"   = 124
}

# Date range (MM-dd-yyyy): July 1, 2026 up to today. A ticker fails, and nothing is
# written for it, if its data doesn't reach back to $LatestFirstDay (allows for market holidays).
$EndDate   = (Get-Date).ToString("MM-dd-yyyy")
$StartDate = "07-01-2026"
$LatestFirstDay = "2026-07-03"

$OutDir = Join-Path $PSScriptRoot "pse-history"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Culture = [System.Globalization.CultureInfo]::InvariantCulture
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36"
$Failed = 0

Start-Transcript -Path (Join-Path $OutDir "sync.log") -Append | Out-Null

function Finish([int]$ExitCode) {
    Stop-Transcript | Out-Null
    Read-Host "Press Enter to close" | Out-Null
    exit $ExitCode
}

# Upserts one ticker's prices. Assets are matched by name because the MANUAL
# data source identifies them by a generated UUID, not by the ticker.
function Update-GhostfolioPrices([string]$Symbol, [string[]]$Rows) {
    $Values = ($Rows | ForEach-Object { $p = $_ -split ";"; "('$($p[0])',$($p[1]))" }) -join ","
    $Sql = @"
INSERT INTO "MarketData" (id, "dataSource", symbol, date, "marketPrice", state)
SELECT gen_random_uuid()::text, a."dataSource", a.symbol, v.d::timestamp, v.price::double precision, 'CLOSE'
FROM (VALUES $Values) AS v(d, price)
JOIN "SymbolProfile" a ON a.name = '$Symbol' AND a."dataSource" = 'MANUAL'
ON CONFLICT ("dataSource", symbol, date) DO UPDATE
SET "marketPrice" = EXCLUDED."marketPrice", state = EXCLUDED.state;
"@
    $Result = $Sql | docker exec -i gf-postgres sh -c 'psql -v ON_ERROR_STOP=1 -U $POSTGRES_USER -d $POSTGRES_DB'
    if ($LASTEXITCODE -ne 0) { throw "database update failed" }
    if ("$Result" -ne "INSERT 0 $($Rows.Count)") { throw "expected $($Rows.Count) rows, database said: $Result" }
}

docker exec gf-postgres true 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL  Ghostfolio's database is not running. Nothing was updated." -ForegroundColor Red
    Finish 1
}

foreach ($Symbol in $Companies.Keys) {
    $CmpyId = $Companies[$Symbol]
    if (-not $CmpyId) { Write-Host "SKIP  $Symbol (no cmpy_id filled in)" -ForegroundColor DarkGray; continue }

    try {
        # Open the Stock Data page first (gets a session cookie and the security_id).
        $PageUrl = "https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=$CmpyId"
        $Page = Invoke-WebRequest -Uri $PageUrl -SessionVariable Session -UserAgent $UA -UseBasicParsing

        # Find the security_id: prefer the option whose label is the ticker, else the first option.
        $SecurityId = $null
        $Options = [regex]::Matches($Page.Content, '<option[^>]*value="(\d+)"[^>]*>\s*([^<]+?)\s*</option>')
        foreach ($o in $Options) { if ($o.Groups[2].Value -eq $Symbol) { $SecurityId = $o.Groups[1].Value; break } }
        if (-not $SecurityId -and $Options.Count -gt 0) { $SecurityId = $Options[0].Groups[1].Value }
        if (-not $SecurityId) { throw "could not find security_id on the Stock Data page" }

        # Ask for the chart data (same request the page makes when you click 1year).
        $Body = @{ cmpy_id = "$CmpyId"; security_id = "$SecurityId"; startDate = $StartDate; endDate = $EndDate } | ConvertTo-Json -Compress
        $Headers = @{ "X-Requested-With" = "XMLHttpRequest"; "Referer" = $PageUrl; "Origin" = "https://edge.pse.com.ph" }
        $Data = Invoke-RestMethod -Uri "https://edge.pse.com.ph/common/DisclosureCht.ax" -Method Post `
                    -ContentType "application/json" -Body $Body -Headers $Headers -WebSession $Session -UserAgent $UA

        if (-not $Data.chartData -or $Data.chartData.Count -eq 0) { throw "no price data returned" }

        $Lines = $Data.chartData | ForEach-Object {
            $d = [datetime]::ParseExact($_.CHART_DATE, "MMM dd, yyyy HH:mm:ss", $Culture)
            [pscustomobject]@{ Date = $d; Close = $_.CLOSE }
        } | Sort-Object Date -Unique | ForEach-Object {
            "{0};{1}" -f $_.Date.ToString("yyyy-MM-dd"), $_.Close.ToString($Culture)
        }

        $FirstDay = @($Lines)[0].Substring(0, 10)
        if ($FirstDay -gt $LatestFirstDay) { throw "history starts at $FirstDay, too late" }

        $OutFile = Join-Path $OutDir "$Symbol-history.txt"
        Set-Content -Path $OutFile -Value (@("date;marketPrice") + $Lines) -Encoding UTF8
        Update-GhostfolioPrices $Symbol $Lines
        Write-Host ("OK    {0,-6} {1} days  (security_id {2})" -f $Symbol, $Lines.Count, $SecurityId) -ForegroundColor Green
    }
    catch {
        Write-Host "FAIL  $Symbol : $($_.Exception.Message)" -ForegroundColor Red
        $Failed++
    }

    Start-Sleep -Seconds 2   # be polite to the PSE server
}

# Drop cached portfolio calculations so the next page load uses the new prices.
docker exec gf-redis sh -c "export REDISCLI_AUTH=`$REDIS_PASSWORD; redis-cli --scan --pattern 'portfolio-snapshot-*' | xargs -r redis-cli del" | Out-Null

Write-Host "`nDone with $Failed failure(s). Files are in: $OutDir"
Finish $(if ($Failed) { 1 } else { 0 })
