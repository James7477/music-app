# My Voice Music Studio — V7 Neon Edition (TEST)

A phone-first, colorful, standalone web app based on our V6 duet preview. Nothing in this package changes any existing live GitHub Pages site.

## What's new in V7

- Neon concert styling across **Home, My Songs / Playlists, Find / Import, Now Playing, Recording Studio, Singer Profiles, Saved Performances, and Try AI Music**.
- Working **playlist cards** showing real playlists and actual song counts, plus Create Playlist.
- **Now Playing** area with source buttons (Original / Instrumental), playback, lyrics view, audio download, and a Record Over Track shortcut.
- **Studio lineup** controls for Solo or Duet; recording a duet uses one phone microphone and requires choosing two consenting profiles in Home first.
- Large phone-friendly navigation and buttons, genre demo cards, and a waveform panel.
- Everything in V6 remains: local audio import; title/artist lookup via MusicBrainz when online; original Country, Rock, Blues, Pop demo clips; saved lyrics; local singer samples; karaoke recording; saved takes and downloads; optional link to Soundverse and return/import workflow.

## Try it on a phone

**Best option:** upload the *contents* of this folder (not just the ZIP) to a **separate TEST-only GitHub Pages repository** with `index.html` at the root, then open that test site's HTTPS address on your phone. Do not replace the live app until V7 is reviewed and approved.

You can also unzip the folder and open `index.html`, but recording and local storage may be blocked when the browser opens local `file://` files; adding the built-in original demo also uses `fetch`, which requires a web server. An HTTPS site is best for microphone permission and persistent storage.

### Quick test

1. Open the **Home** tab and tap **Hear Original Demo**. The original demo is added to the local song library, and Studio opens.
2. In **Record**, use **Explore Genre Demos** to hear four *original instrumental arrangements* of the demo (Country, Rock, Blues, Pop). The genre preview is separate from the attached instrumental that karaoke recording uses.
3. Open **Songs**. Tap a playlist card, open a song, play Original or Instrumental where available, save your own lyrics, or attach files you have permission to use.
4. Open **Profiles**. Add a singer with that person's consent, then record 20–30 seconds of spoken audio. Profile samples remain local until voluntarily exported.
5. In **Record**, select the song and record karaoke; use headphones for the best result. To record two people live, set up two consenting singers under **Home > Duet**, then record both together into the phone microphone.
6. Open **My Recordings** from the Songs quick action. Replay and download your performance.
7. Open **Try AI** to visit the provider's website in another tab. Bring back any finished audio file and import it into your local library. No money is collected and no affiliate tracking is enabled in this TEST.

## What this version does NOT yet do

- Does not clone voices or sing automatically in a saved voice.
- Does not convert a commercial country track into rock. The four demo audio files are **four arrangements of our own short original demo**.
- Does not automatically pull copyrighted audio or lyrics from search results.
- Does not automatically synchronize typed lyrics to the music or automatically combine two recorded voices into a generated AI duet.
- Does not sync songs between devices or upload your recordings anywhere.
- Does not process payments or track affiliate referrals.

## Privacy & backups

Songs, audio files, recordings, and voice samples are stored in your browser's **IndexedDB** on this device. Browser storage can be cleared or evicted. Download finished recordings you want to keep. Each singer must consent to their recording and any later third-party AI upload. For copyrighted material, use only audio and lyrics you are permitted to use.

## Included files

- `index.html`, `styles.css`, `v7.css` — interface and responsive design
- `app.js`, `profiles-partner.js`, `duet-home.js`, `v7.js` — interactive features
- `assets/*` — image and icon assets
- `demo/*.mp3` — four original instrumental genre clips
- `manifest.webmanifest` — installable web-app metadata where supported

Version: V7 Neon Edition TEST — November 2026.
