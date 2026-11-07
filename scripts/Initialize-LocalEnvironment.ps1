param([string]$DatabaseUser, [Security.SecureString]$DatabasePassword, [int]$MySqlPort = 3306, [string]$PublicKeyPath, [string]$AccountsFile)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath 'prisma/schema.prisma')) { throw 'Run from the repository root.' }
foreach ($file in @('.env', '.env.demo.local')) { if (Test-Path -LiteralPath $file) { throw ('Preserving existing ' + $file + '. Use the existing-installation guide.') } }
if (-not $DatabaseUser) { $DatabaseUser = Read-Host 'Local MySQL application user (not a website account)' }
if (-not $DatabasePassword) { $DatabasePassword = Read-Host 'Your MySQL application-user password' -AsSecureString }
if (-not $AccountsFile) { $AccountsFile = Read-Host 'Full path to the private accounts.csv supplied by Yesel' }
$AccountsFile = (Resolve-Path -LiteralPath $AccountsFile).Path.Replace('\', '/')
if (-not $PublicKeyPath) { $PublicKeyPath = Read-Host 'MySQL server public_key.pem path (blank only if RSA pinning is unnecessary)' }
if ($PublicKeyPath) {
  $PublicKeyPath = (Resolve-Path -LiteralPath $PublicKeyPath).Path.Replace('\', '/')
  if (-not ([IO.File]::ReadAllText($PublicKeyPath).Contains('-----BEGIN PUBLIC KEY-----'))) { throw 'Choose this server''s public PEM, never its private key.' }
}
if ($MySqlPort -lt 1 -or $MySqlPort -gt 65535) { throw 'Invalid MySQL port.' }
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DatabasePassword)
try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
if (-not $DatabaseUser -or -not $plain -or $plain -match '[\r\n]') { throw 'Supply nonempty local database credentials without newlines.' }
$url = 'mysql://' + [Uri]::EscapeDataString($DatabaseUser) + ':' + [Uri]::EscapeDataString($plain) + '@127.0.0.1:' + $MySqlPort + '/e_lingkod_bayan_demo'
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
try { $random.GetBytes($bytes) } finally { $random.Dispose() }
$secret = [Convert]::ToBase64String($bytes)
$app = @(('DATABASE_URL="' + $url + '"'), ('BETTER_AUTH_SECRET="' + $secret + '"'), 'BETTER_AUTH_URL=http://localhost:3000', 'NEXT_PUBLIC_APP_URL=http://localhost:3000', ('MYSQL_RSA_PUBLIC_KEY_PATH="' + $PublicKeyPath + '"'))
$demo = @(('DEMO_DATABASE_URL="' + $url + '"'), ('DEMO_AUTH_SECRET="' + $secret + '"'), 'DEMO_BASE_URL=http://localhost:3000', ('DEMO_ACCOUNTS_FILE="' + $AccountsFile + '"'), ('MYSQL_RSA_PUBLIC_KEY_PATH="' + $PublicKeyPath + '"'))
$encoding = New-Object Text.UTF8Encoding($false)
function Write-NewPrivateConfiguration([string]$FileName, [string]$Content) {
  # CreateNew also closes the race while the operator is answering prompts.
  # An existing file is never overwritten, even if it appeared after preflight.
  $stream = [IO.File]::Open((Join-Path (Get-Location).Path $FileName), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try { $payload = $encoding.GetBytes($Content); $stream.Write($payload, 0, $payload.Length) }
  finally { $stream.Dispose() }
}
Write-NewPrivateConfiguration '.env' (($app -join "`n") + "`n")
Write-NewPrivateConfiguration '.env.demo.local' (($demo -join "`n") + "`n")
$plain = $null; $url = $null; $secret = $null
Write-Output 'Created private .env and .env.demo.local for e_lingkod_bayan_demo at http://localhost:3000. Existing configuration and database were not changed.'
