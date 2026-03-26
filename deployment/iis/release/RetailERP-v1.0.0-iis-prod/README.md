# RetailERP IIS Release Pack - v1.0.0 (prod)

Built: 2026-03-24 08:49  |  By: EzhaanMA

## Quick Deploy

Run on the target Windows Server (as Administrator):

    powershell -ExecutionPolicy Bypass -File Install.ps1 -Environment prod

## Services

| Service     | Port |
|-------------|------|
| Gateway     | 5000 |
| Auth        | 5001 |
| Product     | 5002 |
| Inventory   | 5003 |
| Order       | 5004 |
| Production  | 5005 |
| Billing     | 5006 |
| Reporting   | 5007 |
| Frontend    | 3003 |

## Rollback

    powershell -ExecutionPolicy Bypass -File Rollback.ps1 -Environment prod

## Logs

    C:\RetailERP\Logs\
