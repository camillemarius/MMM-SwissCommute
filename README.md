# MMM-SwissCommute

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

It displays the next departures for your favorite (train) connection including delays and track change information.

This module is based on the search.ch Fahrplan API <https://fahrplan.search.ch/api/help>

This fork of [nixnuex/MMM-SwissCommute](https://github.com/nixnuex/MMM-SwissCommute) shows the whole connection: one row per vehicle through to the destination, with transfers, platform, arrival, delays, cancellations and disruption notices.

```
10:34      9      Wabern, Gurtenbahn → Bern, Bahnhof              10:42
  10:53 +3 IR 66  Bern → Ins                          Gl. 7       11:16 +4
  11:30    S20    Ins → Murten/Morat  fällt aus       Gl. 3       11:40
⚠ Bauarbeiten Ins–Murten: Ersatzbusse zwischen Ins und Murten
```

- delays (`+3`) in red after departure and arrival, on every row
- a changed platform in red
- a cancelled trip struck through, with "fällt aus"
- disruption notices below the connection
- a line between connections; transfers smaller and dimmer, their departure time indented
- icons for tram, bus and train (`showIcons`); trams show only their number, buses "Bus 19"

search.ch documents delays and platform changes, but not cancellations or the format of disruption notices. Cancellations are recognised by a delay of `X` or a `cancelled` flag.

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
modules: [
	{
		module: 'MMM-SwissCommute',
		position: 'bottom_left',
		header: 'Train Connections',
		config: {
			from: 'Zürich HB', // Start train station
			to: 'Basel SBB', // Destination station
			maximumEntries: 4, // Max departures displayed
			minWalkingTime: 10 // Minimum time to get to the station
		}
	},
]
```

## Configuration options

| Option           | Description
|----------------- |-----------
| `from`        | *Required* Departure station
| `to `        | *Required* Destination station
| `maximumEntries `        | *Optional* Maximum number of connections in list <br><br>**Type:** `int` <br>Default 5
| `showIcons`        | *Optional* Tram, bus or train symbol before the line <br><br>**Type:** `bool` <br>Default true
| `stripCity`        | *Optional* Leave out the town of the `from` station in stop names, e.g. "Bern, Sandrain → Bern, Bahnhof" becomes "Sandrain → Bahnhof". Stops in other towns keep their full name <br><br>**Type:** `bool` <br>Default false
| `showFrom`, `showUntil`        | *Optional* Show connections only in this time window, e.g. `"05:00"` and `"08:00"`. Outside it the module stays empty, without header, and sends no requests to search.ch <br><br>**Type:** `string` <br>Default `""` (always)
| `hideNotification`        | *Optional* Name of a notification, e.g. `"ROLLER_GOOD"` from [MMM-RollerCheck](https://github.com/camillemarius/MMM-RollerCheck): while it says `true`, the module shows nothing (no header) <br><br>**Type:** `string` <br>Default `""` (off)
| `showDays`        | *Optional* Connections only on these days, `0` = Sunday, e.g. `[1, 2, 3, 4, 5]` = Monday to Friday; no requests on other days <br><br>**Type:** `int[]` <br>Default `[]` (every day)
| `showTransfers`        | *Optional* Show the whole connection, one row per vehicle. `false` shows one row per connection as in the original module <br><br>**Type:** `bool` <br>Default true
| `minWalkingTime `        | *Optional* Minimum time in minutes to reach the `from` station. Used to highlight a connection in red in case cannot be reached in time. Only with `showTransfers: false` <br><br>**Type:** `int` <br>Default -1
| `hideTrackInfo`        | *Optional* Hide the track column. Only with `showTransfers: false` <br><br>**Type:** `int` <br>Default 0

## Tests

The tests use MagicMirror's own `moment`, so run them inside `MagicMirror/modules/MMM-SwissCommute` (Node 18 or newer):

```sh
node --test test/*.test.js
```
