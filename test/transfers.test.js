"use strict";
// Tests for the connection display. Run inside MagicMirror/modules/MMM-SwissCommute: node --test test/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

global.moment = require(require("path").join(__dirname, "..", "..", "..", "node_modules", "moment"));
global.Log = { info () {}, error () {} };
global.config = { language: "de" };
let def;
global.Module = { register: (name, d) => { def = d; } };
require("../MMM-SwissCommute.js");

const leg = (o) => ({ ...o });
const fixture = {
	connections: [
		{
			departure: "2026-10-02 09:52:00", arrival: "2026-10-02 10:43:00", dep_delay: "+0",
			legs: [
				leg({ departure: "2026-10-02 09:52:00", name: "Wabern, Gurtenbahn", type: "tram", line: "9", terminal: "Bern Wankdorf, Bahnhof", exit: { name: "Bern, Bahnhof", arrival: "2026-10-02 10:00:00", track: "B" } }),
				leg({ departure: "2026-10-02 10:00:00", name: "Bern, Bahnhof", type: "walk", exit: { name: "Bern", arrival: "2026-10-02 10:06:00" } }),
				leg({ departure: "2026-10-02 10:08:00", name: "Bern", type: "strain", line: "S5", terminal: "Avenches", track: "13AB", exit: { name: "Murten/Morat", arrival: "2026-10-02 10:43:00", track: "2" } }),
				leg({ name: "Murten/Morat" })
			]
		},
		{
			departure: "2026-10-02 10:34:00", arrival: "2026-10-02 11:40:00", dep_delay: "+2",
			legs: [
				leg({ departure: "2026-10-02 10:34:00", name: "Wabern, Gurtenbahn", type: "tram", line: "9", terminal: "Bern Wankdorf, Bahnhof", exit: { name: "Bern, Bahnhof", arrival: "2026-10-02 10:42:00" } }),
				leg({ departure: "2026-10-02 10:42:00", name: "Bern, Bahnhof", type: "walk", exit: { name: "Bern" } }),
				leg({ departure: "2026-10-02 10:53:00", name: "Bern", type: "express_train", line: "IR 66", terminal: "La Chaux-de-Fonds", track: "6!", exit: { name: "Ins", arrival: "2026-10-02 11:16:00" } }),
				leg({ departure: "2026-10-02 11:30:00", name: "Ins", type: "strain", line: "S20", terminal: "Fribourg/Freiburg", track: "3", exit: { name: "Murten/Morat", arrival: "2026-10-02 11:40:00" } }),
				leg({ name: "Murten/Morat" })
			]
		}
	]
};

function make (extra = {}) {
	return Object.assign(Object.create(def), {
		config: { ...def.defaults, from: "Wabern, Gurtenbahn", to: "Murten/Morat", ...extra },
		updateDom () {}
	});
}

function fakeDocument () {
	const make = (tag) => ({ tagName: tag, className: "", innerHTML: "", children: [], style: {}, appendChild (c) { this.children.push(c); return c; } });
	return { createElement: make };
}

test("processData: every vehicle leg with departure, line, from, platform, to and arrival", () => {
	const m = make();
	m.processData(fixture);
	assert.deepEqual(m.trains[0].legs, [
		{ dep: "09:52", depDelay: 0, line: "9", type: "tram", from: "Wabern, Gurtenbahn", track: "", trackChange: false, to: "Bern, Bahnhof", arr: "10:00", arrDelay: 0, cancelled: false },
		{ dep: "10:08", depDelay: 0, line: "S5", type: "strain", from: "Bern", track: "13AB", trackChange: false, to: "Murten/Morat", arr: "10:43", arrDelay: 0, cancelled: false }
	]);
	assert.deepEqual(m.trains[1].legs.map((l) => `${l.dep} ${l.line} ${l.from} ${l.track} ${l.to} ${l.arr}`), [
		"10:34 9 Wabern, Gurtenbahn  Bern, Bahnhof 10:42",
		"10:53 IR 66 Bern 6 Ins 11:16",
		"11:30 S20 Ins 3 Murten/Morat 11:40"
	]);
});

test("getDom: the whole connection, one row per vehicle through to the destination", () => {
	global.document = fakeDocument();
	const m = make();
	m.loaded = true;
	m.processData(fixture);
	const rows = m.getDom().children;
	const text = (row) => row.children.map((c) => c.innerHTML.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).join(" | ");
	assert.equal(rows.length, 5, "2 legs + 3 legs");
	assert.equal(text(rows[0]), "09:52 | 9 | Wabern, Gurtenbahn → Bern, Bahnhof |  | 10:00");
	assert.equal(text(rows[1]), "10:08 | S5 | Bern → Murten/Morat | Gl. 13AB | 10:43");
	assert.equal(text(rows[2]), "10:34 +2 | 9 | Wabern, Gurtenbahn → Bern, Bahnhof |  | 10:42");
	assert.equal(text(rows[4]), "11:30 | S20 | Ins → Murten/Morat | Gl. 3 | 11:40");
	assert.match(rows[2].className, /first-leg/, "a new connection starts with its own spacing");
	assert.match(rows[0].children[1].innerHTML, /fa-train-tram/, "tram icon for the tram");
	assert.match(rows[1].children[1].innerHTML, /fa-train"/, "train icon for the S-Bahn");
	delete global.document;
});

test("lineLabel: tram shows only its number, bus says so, trains keep their name", () => {
	const m = make();
	assert.equal(m.lineLabel({ type: "tram", line: "9" }), "9");
	assert.equal(m.lineLabel({ type: "bus", line: "19" }), "Bus 19");
	assert.equal(m.lineLabel({ type: "strain", line: "S52" }), "S52");
	assert.equal(m.lineLabel({ type: "express_train", line: "IR 66" }), "IR 66");
});

test("iconFor: tram, bus and train look different", () => {
	const m = make();
	assert.equal(m.iconFor("tram"), "fa-train-tram");
	assert.equal(m.iconFor("bus"), "fa-bus");
	assert.equal(m.iconFor("post"), "fa-bus");
	assert.equal(m.iconFor("strain"), "fa-train");
	assert.equal(m.iconFor("express_train"), "fa-train");
	assert.equal(m.iconFor("ship"), "fa-ferry");
	assert.equal(m.iconFor("cableway"), "fa-cable-car");
});

const troubled = {
	connections: [
		{
			departure: "2026-10-02 10:34:00", arrival: "2026-10-02 11:44:00", dep_delay: "+0",
			legs: [
				leg({ departure: "2026-10-02 10:34:00", name: "Wabern, Gurtenbahn", type: "tram", line: "9", terminal: "Bern Wankdorf, Bahnhof", dep_delay: "+0", exit: { name: "Bern, Bahnhof", arrival: "2026-10-02 10:42:00", arr_delay: "+0" } }),
				leg({ departure: "2026-10-02 10:53:00", name: "Bern", type: "express_train", line: "IR 66", track: "7!", dep_delay: "+3", disruptions: [{ header: "Bauarbeiten zwischen Bern und Ins", text: "Verspätungen bis 5 Minuten." }], exit: { name: "Ins", arrival: "2026-10-02 11:16:00", arr_delay: "+4" } }),
				leg({ departure: "2026-10-02 11:30:00", name: "Ins", type: "strain", line: "S20", track: "3", dep_delay: "X", disruptions: ["Bauarbeiten zwischen Bern und Ins"], exit: { name: "Murten/Morat", arrival: "2026-10-02 11:40:00" } }),
				leg({ name: "Murten/Morat" })
			]
		}
	]
};

test("processData: delays, platform change and cancellation per vehicle", () => {
	const m = make();
	m.processData(troubled);
	const [tram, ir, s20] = m.trains[0].legs;
	assert.deepEqual([tram.depDelay, tram.arrDelay, tram.cancelled], [0, 0, false]);
	assert.deepEqual([ir.depDelay, ir.arrDelay, ir.track, ir.trackChange, ir.cancelled], [3, 4, "7", true, false]);
	assert.equal(s20.cancelled, true);
	assert.deepEqual(m.trains[0].notices, ["Bauarbeiten zwischen Bern und Ins"], "notices collected once");
});

test("getDom: delays in red on every row, changed platform red, cancelled trip marked, notice under the connection", () => {
	global.document = fakeDocument();
	const m = make();
	m.loaded = true;
	m.processData(troubled);
	const rows = m.getDom().children;
	const text = (row) => row.children.map((c) => c.innerHTML.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).join(" | ");
	assert.equal(rows.length, 4, "3 vehicles + 1 notice");
	assert.equal(text(rows[1]), "10:53 +3 | IR 66 | Bern → Ins | Gl. 7 | 11:16 +4");
	assert.match(rows[1].children[0].innerHTML, /class="red">\+3/);
	assert.match(rows[1].children[4].innerHTML, /class="red">\+4/);
	assert.match(rows[1].children[3].className, /red/, "platform changed");
	assert.match(rows[2].className, /cancelled/);
	assert.match(text(rows[2]), /fällt aus/);
	assert.match(rows[3].className, /notice/);
	assert.equal(text(rows[3]), "⚠ Bauarbeiten zwischen Bern und Ins");
	delete global.document;
});

test("processData: never more connections than maximumEntries, even if the API sends more", () => {
	const m = make({ maximumEntries: 1 });
	m.processData(fixture);
	assert.equal(m.trains.length, 1);
	assert.equal(m.trains[0].departureTimestamp, "09:52");
});

test("getDom: showTransfers false keeps one row per connection", () => {
	global.document = fakeDocument();
	const m = make({ showTransfers: false });
	m.loaded = true;
	m.processData(fixture);
	assert.equal(m.getDom().children.length, 2);
	delete global.document;
});

test("showIcons false: the line without a tram, bus or train symbol", () => {
	global.document = fakeDocument();
	const m = make({ showIcons: false });
	m.loaded = true;
	m.processData(fixture);
	const rows = m.getDom().children;
	assert.equal(rows[0].children[1].innerHTML, "9");
	assert.equal(rows[1].children[1].innerHTML, "S5");
	delete global.document;
});

test("stripCity: stops in the town of the departure station lose the town name, others stay", () => {
	const m = make({ from: "Bern, Bahnhof", stripCity: true });
	m.processData(fixture);
	assert.deepEqual(m.trains[0].legs.map((l) => `${l.from} → ${l.to}`), [
		"Wabern, Gurtenbahn → Bahnhof",
		"Bern → Murten/Morat"
	]);
	const off = make({ from: "Bern, Bahnhof" });
	off.processData(fixture);
	assert.equal(off.trains[0].legs[0].to, "Bern, Bahnhof", "off by default");
});

function at (time, extra = {}) {
	const m = make({ showFrom: "05:00", showUntil: "08:00", ...extra });
	m.data = { header: "Sandrain → Murten" };
	m.now = () => moment(`2026-10-02T${time}:00`);
	return m;
}

test("showFrom/showUntil: connections and header only inside the time window", () => {
	global.document = fakeDocument();
	const inside = at("06:30");
	inside.loaded = true;
	inside.processData(fixture);
	assert.equal(inside.getHeader(), "Sandrain → Murten");
	assert.equal(inside.getDom().children.length, 5);
	for (const time of ["04:59", "08:00", "11:10"]) {
		const outside = at(time);
		outside.loaded = true;
		outside.processData(fixture);
		assert.equal(outside.getHeader(), "", time);
		assert.equal(outside.getDom().children.length, 0, time);
	}
	assert.equal(at("23:30", { showFrom: "22:00", showUntil: "02:00" }).isActiveTime(), true, "window over midnight");
	assert.equal(at("03:00", { showFrom: "22:00", showUntil: "02:00" }).isActiveTime(), false);
	assert.equal(at("11:10", { showFrom: "", showUntil: "" }).isActiveTime(), true, "no window = always");
	delete global.document;
});

test("showFrom/showUntil: no request to search.ch outside the window, old connections dropped", () => {
	let requests = 0;
	global.XMLHttpRequest = function () { requests++; this.open = () => {}; this.send = () => {}; };
	const m = at("11:10");
	let next = null;
	m.scheduleUpdate = (delay) => { next = delay; };
	m.loaded = true;
	m.processData(fixture);
	m.getData();
	assert.equal(requests, 0);
	assert.ok(next > 0, "checks the clock again later");
	assert.deepEqual([m.loaded, m.trains.length], [false, 0], "no stale connections when the window opens");
	m.now = () => moment("2026-10-02T06:00:00");
	m.getData();
	assert.equal(requests, 1);
	delete global.XMLHttpRequest;
});

test("hideNotification: the timetable steps aside while the notification says true", () => {
	global.document = fakeDocument();
	const m = make({ hideNotification: "ROLLER_GOOD" });
	m.data = { header: "Sandrain → Murten" };
	m.loaded = true;
	m.processData(fixture);
	m.notificationReceived("ROLLER_GOOD", true);
	assert.equal(m.getHeader(), "");
	assert.equal(m.getDom().children.length, 0);
	m.notificationReceived("ROLLER_GOOD", false);
	assert.equal(m.getHeader(), "Sandrain → Murten");
	assert.equal(m.getDom().children.length, 5);
	m.notificationReceived("SOMETHING_ELSE", true);
	assert.equal(m.getDom().children.length, 5, "other notifications do not matter");
	const plain = make();
	plain.data = { header: "x" };
	plain.notificationReceived("ROLLER_GOOD", true);
	assert.equal(plain.getHeader(), "x", "off unless configured");
	delete global.document;
});

test("showDays: connections only on these days (0 = Sunday), no requests on other days", () => {
	const m = at("06:30", { showDays: [1, 2, 3, 4, 5] }); // Friday
	assert.equal(m.isActiveTime(), true);
	m.now = () => moment("2026-10-03T06:30:00"); // Saturday
	assert.equal(m.isActiveTime(), false);
	assert.equal(m.getHeader(), "");
	m.now = () => moment("2026-10-05T06:30:00"); // Monday
	assert.equal(m.isActiveTime(), true);
	assert.equal(at("06:30", { showDays: [] }).isActiveTime(), true, "empty = every day");
});
