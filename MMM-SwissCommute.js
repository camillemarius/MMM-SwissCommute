/* global Module */

/* Magic Mirror
 * Module: MMM-SwissCommute
 *
 * By nixnuex
 * based on MMM-swisstransport (https://github.com/Bangee44/MMM-swisstransport)
 *
 * MIT Licensed.
 */

Module.register("MMM-SwissCommute",{
	// Define module defaults
	defaults: {
		updateInterval: 2 * 60 * 1000, // Update every 2 minutes. Note: search.ch API limit is 1000 requests per day
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25, // Start on 1/4th of the list.
        initialLoadDelay: 0, // start delay seconds.

        domRefresh: 1000 * 30, // Refresh Dom each 30 s
		
        apiBase: 'http://fahrplan.search.ch/api/route.json',
        from: '',
        to: '',
        showTransfers: true, // Stop to get off, arrival and transfers per connection
        showIcons: true, // tram, bus or train symbol before the line
        stripCity: false, // "Bern, Sandrain" -> "Sandrain" for stops in the town of the from station
        showFrom: "", // with showUntil, e.g. "05:00" and "08:00": connections only in this time window (empty = always)
        showUntil: "",
		maximumEntries: 5, // Total Maximum Entries
        minWalkingTime: -1,
        hideTrackInfo: 0,
                
//		titleReplace: {
//			"Zeittabelle ": ""
//		}
	},
	
	requiresVersion: "2.1.0", // Required version of MagicMirror

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

        this.trains = [];
		this.loaded = false;
		this.scheduleUpdate(this.config.initialLoadDelay);

		// Update DOM seperatly and not only on schedule Update
		var self = this;
		setInterval(function() {
			self.updateDom(this.config.animationSpeed);
		}, this.config.domRefresh);

		this.updateTimer = null;

	},   
	
	// Redraw when shown again (e.g. face recognition). MagicMirror drops an
	// update that arrives while the module is being hidden, leaving "Loading connections ..." until the next refresh.
	resume: function() {
		if (this.loaded) {
			this.updateDom(0);
		}
	},

	// Define required scripts.
	getStyles: function() {
		return ["MMM-SwissCommute.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	}, 
    
	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		var currentTime = moment();
		
		if (!this.config.from) {
			wrapper.innerHTML = "Invalid starting point";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		if (!this.config.to) {
			wrapper.innerHTML = "Invalid destination";
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		if (!this.isActiveTime()) {
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = "Loading connections ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (this.message) {
			wrapper.innerHTML = this.message;
			wrapper.className = "dimmed light small";
			return wrapper;
		}
		
		var table = document.createElement("table");
		table.className = "small";

		for (var t in this.trains) {
			var trains = this.trains[t];

			// The whole connection, one row per vehicle through to the destination
			if (this.config.showTransfers && trains.legs && trains.legs.length) {
				var legOpacity = this.fadeOpacity(t);
				for (var l = 0; l < trains.legs.length; l++) {
					var leg = trains.legs[l];
					var legRow = document.createElement("tr");
					legRow.className = "leg" + (l === 0 ? " first-leg" : "") + (leg.cancelled ? " cancelled" : "");
					var legCells = [
						["align-left departuretime", leg.dep + this.delayHtml(leg.depDelay)],
						["align-left line", (this.config.showIcons ? "<i class=\"fa " + this.iconFor(leg.type) + "\"></i> " : "") + this.lineLabel(leg)],
						["align-left route", leg.from + " → " + leg.to + (leg.cancelled ? " <span class=\"red cancel-note\">fällt aus</span>" : "")],
						["align-left track" + (leg.trackChange ? " red" : ""), leg.track ? "Gl. " + leg.track : ""],
						["align-left arrival", leg.arr + this.delayHtml(leg.arrDelay)]
					];
					for (var c = 0; c < legCells.length; c++) {
						var legCell = document.createElement("td");
						legCell.className = legCells[c][0];
						legCell.innerHTML = legCells[c][1];
						legRow.appendChild(legCell);
					}
					if (legOpacity < 1) legRow.style.opacity = legOpacity;
					table.appendChild(legRow);
				}
				// disruption notices under the connection
				for (var n = 0; n < (trains.notices || []).length; n++) {
					var noticeRow = document.createElement("tr");
					noticeRow.className = "notice";
					var noticeCell = document.createElement("td");
					noticeCell.colSpan = 5;
					noticeCell.className = "align-left red";
					noticeCell.innerHTML = "⚠ " + this.escapeHtml(trains.notices[n]);
					noticeRow.appendChild(noticeCell);
					table.appendChild(noticeRow);
				}
				continue;
			}

			var row = document.createElement("tr");
			table.appendChild(row);

			// Number & Icon
			var trainNumberCell = document.createElement("td");
			trainNumberCell.innerHTML = "<i class=\"fa " + this.iconFor(trains.type) + "\"></i> " + trains.number;
			trainNumberCell.className = "align-left";
			row.appendChild(trainNumberCell);

			// Direction
			var trainToCell = document.createElement("td");
			trainToCell.innerHTML = trains.to;
			trainToCell.className = "align-left trainto";
			row.appendChild(trainToCell);

			// Time
			var dTime = moment(trains.departureTimestampRaw);
			var diff = dTime.diff(currentTime, 'minutes');

			var depCell = document.createElement("td");
			depCell.className = "align-left departuretime";
			depCell.innerHTML = trains.departureTimestamp;

			if (diff <= this.config.minWalkingTime ){
				row.className = "red";
			}

			row.appendChild(depCell);

			// Delay
            var delayCell = document.createElement("td");
            if(trains.delay > 0) {
                delayCell.className = "delay red";
                delayCell.innerHTML = "+" + trains.delay + " min";
            } else {
                delayCell.className = "delay red";
                delayCell.innerHTML = ""; //trains.delay;
            }
            row.appendChild(delayCell);
            
            // Track
            if (!this.config.hideTrackInfo) {
	            var trackCell = document.createElement("td");
    	        trackCell.innerHTML = trains.track;
        	    if(trains.trackChange) trackCell.className = "track red";
            	row.appendChild(trackCell);
            }

			var opacity = this.fadeOpacity(t);
			if (opacity < 1) row.style.opacity = opacity;
		}

		return table;
	},

	/* Opacity of connection number t (fade towards the end of the list). */
	fadeOpacity: function(t) {
		if (!this.config.fade || this.config.fadePoint >= 1) return 1;
		var fadePoint = Math.max(this.config.fadePoint, 0);
		var startingPoint = this.trains.length * fadePoint;
		var steps = this.trains.length - startingPoint;
		if (t < startingPoint) return 1;
		return 1 - (1 / steps * (t - startingPoint));
	},

	/* "+3" -> 3, "+0"/missing/"X" -> 0 */
	delayMinutes: function(value) {
		var minutes = parseInt(value, 10);
		return isNaN(minutes) ? 0 : minutes;
	},

	/* search.ch documents no cancel field; assumed markers: delay "X" or a cancelled flag. */
	isCancelled: function(l) {
		return String(l.dep_delay || "").toUpperCase() === "X" || l.cancelled === true || l.isCancelled === true;
	},

	delayHtml: function(minutes) {
		return minutes > 0 ? " <span class=\"red\">+" + minutes + "</span>" : "";
	},

	escapeHtml: function(text) {
		return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	},

	/* Current time; a method so the tests can set the clock. */
	now: function() {
		return moment();
	},

	/* Inside the showFrom-showUntil window (also over midnight); always when not set. */
	isActiveTime: function() {
		if (!this.config.showFrom || !this.config.showUntil) return true;
		var hhmm = function(value) {
			var parts = String(value).split(":");
			return ("0" + parts[0]).slice(-2) + ":" + ("0" + (parts[1] || "0")).slice(-2);
		};
		var time = this.now().format("HH:mm");
		var from = hhmm(this.config.showFrom);
		var until = hhmm(this.config.showUntil);
		return from <= until ? time >= from && time < until : time >= from || time < until;
	},

	/* No header outside the time window; MagicMirror hides an empty header. */
	getHeader: function() {
		return this.isActiveTime() ? this.data.header : "";
	},

	/* "Bern, Sandrain" -> "Sandrain" with stripCity, when the stop lies in the town of the from station. */
	stationLabel: function(name) {
		var text = String(name || "");
		if (!this.config.stripCity) return text;
		var town = String(this.config.from || "").split(",")[0].trim();
		return town && text.indexOf(town + ", ") === 0 ? text.slice(town.length + 2) : text;
	},

	/* Tram only its number ("9", the icon says tram), "Bus 19", trains keep their name. */
	lineLabel: function(leg) {
		if (leg.type === "bus" || leg.type === "post" || leg.type === "night_bus") return "Bus " + leg.line;
		return leg.line;
	},

	/* Tram, bus and train get different icons (Font Awesome 6). */
	iconFor: function(type) {
		switch (type) {
			case "tram": return "fa-train-tram";
			case "bus": case "post": case "night_bus": return "fa-bus";
			case "ship": return "fa-ferry";
			case "cableway": case "gondola": case "chairlift": case "funicular": return "fa-cable-car";
			case "subway": case "metro": return "fa-train-subway";
			default: return "fa-train";
		}
	},

	/* getData(compliments)
	 * Calls processData on succesfull response.
	 */
	getData: function() {
		// outside showFrom-showUntil: no request; drop old connections so none are shown when the window opens
		if (!this.isActiveTime()) {
			this.loaded = false;
			this.trains = [];
			this.scheduleUpdate(60 * 1000);
			return;
		}

		var url = this.config.apiBase + this.getParams();
		var self = this;
		var retry = true;

		var trainRequest = new XMLHttpRequest();
		trainRequest.open("GET", url, true);
		trainRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processData(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.config.station = "";
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect waht so ever...");
					retry = false;
				} else {
					Log.error(self.name + ": Could not load trains.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		trainRequest.send();
	},

	/* getParams(compliments)
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams: function() {
		var params = "?show_delays=1&show_trackchanges=1&";
        params += "from=" + this.config.from;
        params += "&to=" + this.config.to;
		params += "&num=" + this.config.maximumEntries;
                
		return params;
	},

	/* processData(data)
	 * Uses the received data to set the various values.
	 *
	 * argument data object - Weather information received form openweather.org.
	 */
	processData: function(data) {
		this.trains = [];
		this.message = "";
		
		if ('connections' in data) {
			for (var i = 0, count = data.connections.length; i < count; i++) {
				var trains = data.connections[i];

				if("departure" in trains.legs[0] && "terminal" in trains.legs[0] && "line" in trains.legs[0]) {
					var conn = {
						departureTimestampRaw: trains.departure,
						departureTimestamp: moment(trains.departure).format("HH:mm"),
						delay: parseInt(trains.dep_delay),
						to: trains.legs[0].terminal,
						type: trains.legs[0].type,
						number: trains.legs[0].line,
						track: trains.legs[0].track
					};

					// Every vehicle leg through to the destination,
					// with delays ("+3"), platform changes ("7!") and cancellations
					var self = this;
					conn.legs = trains.legs
						.filter(function(l) { return l.type && l.type !== "walk" && l.line; })
						.map(function(l) {
							return {
								dep: moment(l.departure).format("HH:mm"),
								depDelay: self.delayMinutes(l.dep_delay),
								line: l.line,
								type: l.type,
								from: self.stationLabel(l.name),
								track: String(l.track || "").replace("!", ""),
								trackChange: String(l.track || "").indexOf("!") >= 0,
								to: l.exit ? self.stationLabel(l.exit.name) : "",
								arr: l.exit && l.exit.arrival ? moment(l.exit.arrival).format("HH:mm") : "",
								arrDelay: self.delayMinutes(l.exit && l.exit.arr_delay),
								cancelled: self.isCancelled(l)
							};
						});
					// older answers carry the delay only on the connection
					if (conn.legs.length && !conn.legs[0].depDelay && conn.delay > 0) conn.legs[0].depDelay = conn.delay;
					// disruption notices of the connection and its vehicles, each text once
					conn.notices = [];
					var addNotice = function(d) {
						var text = typeof d === "string" ? d : (d && (d.header || d.title || d.lead || d.text || d.description)) || "";
						text = String(text).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
						if (text.length > 90) text = text.slice(0, 89) + "…";
						if (text && conn.notices.indexOf(text) < 0) conn.notices.push(text);
					};
					(trains.disruptions || []).forEach(addNotice);
					trains.legs.forEach(function(l) { (l.disruptions || []).forEach(addNotice); });
				
					if (typeof conn.track != 'undefined') {
						conn.trackChange = conn.track.indexOf("!") > 0;
					}
					else {
						conn.track = "";
						conn.trackChange = 0;
					}
								
					this.trains.push(conn);
				}
			}
		}
		else {
			this.message = data.messages[0];
		}

		// The API sometimes sends more connections than "num" asked for
		this.trains = this.trains.slice(0, this.config.maximumEntries);

		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.getData();
		}, nextLoad);
	},
});
