# Easter Chore Hunt Supabase Full Progress Version

Core files:
- index.html
- styles.css
- script.js
- config.js
- supabase-config.js
- leaderboard_and_progress_setup.sql
- property-map.png

What this version does:
- shared leaderboard across devices using Supabase
- full team progress stored in Supabase
- teams can switch devices and reload their place
- team picker and team name gate on first open
- Easter-themed design
- separate pages for Chores, Map, and Leaderboard
- hint timer pill beside the hint button


Fixes in this version:
- scanner uses Html5QrcodeScanner with both camera scan and file scan modes
- local leaderboard always works even if Supabase is not configured
- local progress always works even if Supabase is not configured
- Supabase syncing is additive instead of blocking the UI


Locked team-name version:
- players cannot edit team settings from the site
- the first claimed team name is locked for later devices


Admin-only version:
- hidden admin entry: tap the site title 5 times quickly
- default admin passcode: bunnyboss
- admin can rename teams, reload shared progress, and reset any team
- player-facing team settings remain hidden


Rabbit admin access version:
- player-facing team settings are completely removed
- click the rabbit next to "Easter Chore Hunt" to open passcode prompt
- passcode: bunnyboss
- any other passcode closes the prompt
- there is an X button to close the prompt
