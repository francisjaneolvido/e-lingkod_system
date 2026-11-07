# Staff invitations

An authenticated Admin manages Staff from `/admin/staff`. Staff roles, module grants, office scope and census barangay permissions remain separate. New public registration never selects Staff or Admin. The synthetic fixture loader provisions only its known, newly owned reserved-domain accounts; it does not send invitations or email.

For email delivery, configure these server-only values in the local environment and restart the app:

| Value | Purpose |
|---|---|
| `RESEND_API_KEY` | A provider API key belonging to your own configured account. |
| `STAFF_INVITE_FROM` | A sender address/domain verified by that provider. |
| `BETTER_AUTH_URL` | The origin recipients should open. Production invitation links require HTTPS. |

Invitation links are single-use and expire after 48 hours. Recipients choose their own password through the activation page. Keep links private. A successful database invitation record alone does not prove email delivery; inspect the application's reported delivery state and provider result.

Without the provider variables, email delivery is disabled. In development only, an operator can deliberately enable `STAFF_INVITE_DEMO_LINKS=true` to obtain a private local activation link instead. This is not delivery and is unavailable in production. Do not enable it for a public service or include activation links in logs/review packages. The normal installation guide needs neither external mail nor development activation links.

Password recovery uses its separate [sender and token lifecycle](PASSWORD-RECOVERY.md). Recovery does not grant Staff access or approve citizen identity.
