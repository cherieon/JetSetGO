# JetSetGO

Celebrity flight tracker with live ADS-B data.

## Live Tracker Setup

Set these environment variables before starting the server:

- `OPENSKY_USERNAME` and `OPENSKY_PASSWORD` (optional, but recommended for better rate limits)
- `CELEBRITY_AIRCRAFT` (JSON array describing celebrity jets)

Example `CELEBRITY_AIRCRAFT`:

```json
[
	{
		"celebrityName": "Taylor Swift",
		"icao24": "a4f123",
		"tailNumber": "N898TS"
	},
	{
		"celebrityName": "Elon Musk",
		"icao24": "adf7c9",
		"tailNumber": "N628TS"
	}
]
```

Notes:

- Tracking prefers ADS-B identifiers (`icao24`, then `tailNumber`, then optional `callsign`).
- If `CELEBRITY_AIRCRAFT` is not set, the app falls back to matching OpenSky callsigns against stored celebrity flight numbers.
- Live data refreshes every 30 seconds.
