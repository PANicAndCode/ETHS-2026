# Easter Chore Hunt Rebuilt Fixed Version

Files:
- index.html
- styles.css
- script.js
- config.js
- supabase-config.js
- supabase-config.example.js
- property-map.png

What is included now:
- map and leaderboard are on the same page
- the old “How the map works” section is removed
- scanner is on its own page
- scanner now uses photo capture instead of a live camera feed
- scanner reports one of these outcomes: right QR code, wrong QR code, or no QR code detected
- rabbit button opens the admin passcode prompt
- if the passcode is `bunnyboss`, admin tools open
- admin team changes and team progress now live-sync across devices when Supabase is configured

Important:
- cross-device syncing only works when `supabase-config.js` is filled in with your real Supabase project URL and anon key
- if `supabase-config.js` still has the placeholder values, the site falls back to local device storage only
