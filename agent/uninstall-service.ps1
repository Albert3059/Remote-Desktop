param(
  [Parameter(Mandatory=$false)][string]$ServiceName = 'CloudDeskAgent'
)

$ErrorActionPreference = 'Stop'
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service) {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $ServiceName | Out-Null
  Write-Output "Removed $ServiceName"
} else {
  Write-Output "$ServiceName is not installed"
}
