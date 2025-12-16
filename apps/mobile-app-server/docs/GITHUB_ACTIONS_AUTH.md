
(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh auth login         
? Where do you use GitHub? GitHub.com
? What is your preferred protocol for Git operations on this host? HTTPS
? Authenticate Git with your GitHub credentials? No
? How would you like to authenticate GitHub CLI? Login with a web browser

! First copy your one-time code: 2226-A51A
Press Enter to open https://github.com/login/device in your browser... 
✓ Authentication complete.
- gh config set -h github.com git_protocol https
✓ Configured git protocol
✓ Logged in as inquisitivefrog
! You were already logged in to this account

(⎈|N/A:N/A)tim@Timothys-MacBook-Air docs % gh auth status
github.com
  ✓ Logged in to github.com account inquisitivefrog (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
  - Token scopes: 'gist', 'read:org', 'repo'

