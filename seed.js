/**
 * Seeds the database with sample printer locations in Münster.
 * Run: node seed.js
 */

const db = require('./db');

const printers = [
  {
    name: 'Stadtbücherei Münster',
    street: 'Alter Steinweg', house_number: '11', zip: '48143', district: 'Altstadt',
    lat: 51.9618, lng: 7.6278, type: 'library', status: 'active',
    opening_hours: 'Mo–Fr 10–20, Sa 10–17', phone: '0251 4926-0',
  },
  {
    name: 'Copy & Print Center',
    street: 'Salzstraße', house_number: '22', zip: '48143', district: 'Altstadt',
    lat: 51.9630, lng: 7.6252, type: 'copy_shop', status: 'active',
    opening_hours: 'Mo–Fr 8–19, Sa 9–14', phone: '0251 123456',
  },
  {
    name: 'Staples Münster',
    street: 'Scharnhorststraße', house_number: '60', zip: '48151', district: 'Bahnhofsviertel',
    lat: 51.9557, lng: 7.6361, type: 'office_supply', status: 'active',
    opening_hours: 'Mo–Sa 9–20',
  },
  {
    name: 'ULB Münster – Druckerraum',
    street: 'Krummer Timpen', house_number: '3', zip: '48143', district: 'Altstadt',
    lat: 51.9639, lng: 7.6134, type: 'university', status: 'active',
    opening_hours: 'Mo–Fr 9–22, Sa 10–18',
  },
  {
    name: 'Foto & Copy Wieck',
    street: 'Ludgeristraße', house_number: '76', zip: '48143', district: 'Altstadt',
    lat: 51.9597, lng: 7.6299, type: 'copy_shop', status: 'active',
    opening_hours: 'Mo–Fr 8:30–18, Sa 9–13', phone: '0251 234567',
  },
  {
    name: 'Copy Stop Hiltrup',
    street: 'Marktallee', house_number: '8', zip: '48165', district: 'Hiltrup',
    lat: 51.9195, lng: 7.6454, type: 'copy_shop', status: 'active',
    opening_hours: 'Mo–Fr 9–18, Sa 9–13',
  },
  {
    name: 'Schreibwaren & Copy Coerde',
    street: 'Coerder Kirchweg', house_number: '33', zip: '48155', district: 'Coerde',
    lat: 51.9843, lng: 7.6267, type: 'office_supply', status: 'active',
    opening_hours: 'Mo–Fr 9–18:30, Sa 9–13',
  },
  {
    name: 'Hotel Conti – Gästedialyse',
    street: 'Berliner Platz', house_number: '2', zip: '48143', district: 'Bahnhofsviertel',
    lat: 51.9572, lng: 7.6354, type: 'hotel', status: 'active',
    opening_hours: '24/7', phone: '0251 999000',
  },
  {
    name: 'Print & Binden Express',
    street: 'Hammer Straße', house_number: '15', zip: '48153', district: 'Mauritz',
    lat: 51.9576, lng: 7.6474, type: 'copy_shop', status: 'active',
    opening_hours: 'Mo–Fr 8–19',
  },
  {
    name: 'Bürobedarf Kinderhaus',
    street: 'Grevener Straße', house_number: '101', zip: '48159', district: 'Kinderhaus',
    lat: 51.9778, lng: 7.6052, type: 'office_supply', status: 'inactive',
    notes: 'Geschlossen – Renovierung bis Q3 2026',
  },
  {
    name: 'Medienzentrum Münster',
    street: 'Mauritzviertel', house_number: '5', zip: '48143', district: 'Mauritz',
    lat: 51.9593, lng: 7.6428, type: 'library', status: 'active',
    opening_hours: 'Mo–Fr 10–18',
  },
  {
    name: 'Copy World Geistviertel',
    street: 'Geiststraße', house_number: '49', zip: '48151', district: 'Geist',
    lat: 51.9712, lng: 7.6193, type: 'copy_shop', status: 'active',
    opening_hours: 'Mo–Fr 8:30–18:30, Sa 9–14', phone: '0251 345678',
  },
  {
    name: 'Zweigbibliothek Hiltrup',
    street: 'Am Stadtpark', house_number: '1', zip: '48165', district: 'Hiltrup',
    lat: 51.9213, lng: 7.6431, type: 'library', status: 'active',
    opening_hours: 'Di, Do 14–18, Sa 10–13',
  },
  {
    name: 'Handorf Schreibwaren',
    street: 'Handorfer Straße', house_number: '62', zip: '48157', district: 'Handorf',
    lat: 51.9643, lng: 7.6954, type: 'office_supply', status: 'active',
    opening_hours: 'Mo–Fr 8:30–18, Sa 9–13',
  },
  {
    name: 'FH Münster Druckzentrum',
    street: 'Stegerwaldstraße', house_number: '39', zip: '48565', district: 'Steinfurt',
    lat: 51.9668, lng: 7.6081, type: 'university', status: 'active',
    opening_hours: 'Mo–Fr 8–17',
  },
];

const stmt = db.prepare(`
  INSERT INTO printers (name, street, house_number, zip, district, lat, lng, type, status, opening_hours, phone, notes)
  VALUES (@name, @street, @house_number, @zip, @district, @lat, @lng, @type, @status, @opening_hours, @phone, @notes)
`);

db.exec('BEGIN');
try {
  for (const item of printers) {
    stmt.run({ phone: null, notes: null, opening_hours: null, ...item });
  }
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}

console.log(`Seeded ${printers.length} printers.`);
