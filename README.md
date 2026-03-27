# Easter Chore Hunt Rebuilt Fixed Version

Files:
- index.html
- styles.css
- script.js
- config.js
- supabase-config.js
- supabase-config.example.js
- property-map.png

What is fixed:
- map and leaderboard are on the same page
- the 'How the map works' section is removed
- scanner is on its own page
- scanner area is larger on mobile
- rabbit button opens the admin passcode prompt
- X closes the passcode prompt
- if passcode is bunnyboss, admin tools open
- any other passcode closes the prompt

Notes:
- player-facing team settings are completely removed
- leaderboard and team progress still use Supabase if configured
- local fallback still works if Supabase is not configured
