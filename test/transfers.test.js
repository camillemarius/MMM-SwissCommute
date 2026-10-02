"use strict";
// Tests for the connection display. Run inside MagicMirror/modules/MMM-SwissCommute: node --test test/
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
		{ dep: "09:52", line: "9", type: "tram", from: "Wabern, Gurtenbahn", track: "", to: "Bern, Bahnhof", arr: "10:00" },
		{ dep: "10:08", line: "S5", type: "strain", from: "Bern", track: "13AB", to: "Murten/Morat", arr: "10:43" }
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
