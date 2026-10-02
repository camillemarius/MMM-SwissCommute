# MMM-SwissCommute Changelog

## [1.2.0] - Oct 2nd 2026

- Whole connection: one row per vehicle through to the destination with platform and arrival (`showTransfers`, default true)
- Icons for tram, bus and train (`showIcons`); trams show only their number, buses "Bus 19"
- `stripCity`: leave out the town of the `from` station in stop names
- `showFrom`/`showUntil`: connections only in a time window, no requests outside it
- Delays on every row, changed platform in red, cancelled trips struck through, disruption notices
- Line between connections; transfers smaller and dimmer, their departure time indented
- Redraw when the module is shown again (e.g. by face recognition)
- Never more connections than `maximumEntries`

## [1.1.0] - May 1st 2020

- Added icons based on transport type
- Fixed CSS for multiple instaces 

## [1.0.0] - Dec 10th 2017

Initial Release
