# NFCPS WATCH

NFCPS WATCH is the dedicated Christian video destination inside the NFCPS UNIZIK digital library ecosystem.

## Product direction

- Separate `/watch/` route rather than another block on the library homepage.
- Premium, cinematic, mobile-first interface with the NFCPS visual identity.
- Motto: **Watch what builds your faith.**
- Content is intentionally curated from trusted Christian voices rather than sourced from unrestricted YouTube search.

## Founding trusted voices

- Apostle Arome Osayi
- Apostle Michael Orokpo
- Apostle Effa Emmanuel Isaac
- Lawrence Oyor
- Apostle Emmanuel Iren
- Bro. Gbile Akanni / Living Seed
- Apostle Edu Udechukwu
- Evang. Vincent Chukwukelu
- Godswill Ukeme

The backend discovery pool can expand silently across closely related trusted ministries and creators without turning the public UI into an unrestricted search engine.

## Experience

- Dedicated Watch home with featured Christian content.
- A **LIVE NOW** banner appears above the Watch hero when a monitored trusted source is actively broadcasting.
- Reels / Clips rail for short-form Christian content, plus a dedicated Clips filter.
- Search across the NFCPS-curated catalogue.
- Category filters including Prayer, Worship, Revival, Bible Study, Discipleship and related themes.
- Creator filtering through the founding trusted-source rail.
- Privacy-enhanced embedded YouTube playback inside the NFCPS interface.
- In-player Up Next recommendations restricted to the curated Watch catalogue.
- Watch Later saved privately on the current device.
- Continue Watching / recent viewing history saved privately on the current device.
- Share action and optional jump to the original YouTube video.
- One-tap bridge from Watch back into the NFCPS reading library.
- Dedicated mobile navigation: Home, Library, Watch, Moments, My Space.

## Trusted feed automation

The AppDeploy backend exposes `GET /api/watch/feed`.

The Watch backend now:

- pulls public YouTube Atom/RSS uploads from trusted channels;
- resolves selected official channel pages when a stable channel ID is not already configured;
- checks monitored channel live surfaces and returns a privacy-safe `lives` collection for the LIVE NOW banner;
- reads public Shorts surfaces for monitored creators and returns a `clips` collection for the reels experience;
- classifies obvious topics such as Prayer, Worship, Revival, Bible Study, Evangelism, Relationships and Leadership from titles;
- stores the prepared feed in an AppDeploy database cache so opening Watch does not need to wait for a full upstream scan;
- refreshes the trusted upload, shorts and live cache automatically every 10 minutes through `nfcps-watch-refresh`;
- refreshes the open Watch page every few minutes so new live signals can surface without a manual reload;
- merges current trusted uploads with a vetted curated seed catalogue;
- falls back to the curated catalogue or last prepared cache if upstream feeds are temporarily unavailable, so Watch never becomes an empty screen.

No unrestricted user-supplied YouTube URL is fetched by the backend.

## Integration philosophy

NFCPS Watch is designed to connect rather than compete with the library:

**Watch → Read → Save → Continue → Moments**

A member can watch a sermon, worship session or clip, then return to the library to read related Christian material, while NFCPS Moments continues the broader spiritual-growth experience.

Live AppDeploy preview: https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/watch/
