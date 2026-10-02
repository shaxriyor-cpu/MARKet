const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'market.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_serial TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_price INTEGER NOT NULL,
    telegram_username TEXT NOT NULL,
    status TEXT DEFAULT 'yangi',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('Ma\'lumotlar bazasi tayyorlandi!');

const sampleProducts = [
  { serial_number: 'KB-001', name: 'Mechanical Keyboard RGB', description: 'Cherry MX Red switch, RGB backlight', price: 450000, image_url: '', stock: 5 },
  { serial_number: 'MS-002', name: 'Gaming Mouse Wireless', description: '16000 DPI, 70 soat batareya', price: 320000, image_url: '', stock: 8 },
  { serial_number: 'MP-003', name: 'Mouse Pad XL', description: '900x400mm, suvga chidamaz', price: 85000, image_url: '', stock: 15 },
  { serial_number: 'HD-004', name: 'Headset 7.1 Surround', description: 'Virtual 7.1, noise cancelling mic', price: 380000, image_url: '', stock: 6 },
  { serial_number: 'SS-005', name: 'SSD 1TB NVMe', description: 'Read 7000MB/s, Write 5000MB/s', price: 550000, image_url: '', stock: 10 },
  { serial_number: 'HUB-006', name: 'USB-C Hub 7-in-1', description: 'HDMI 4K, USB 3.0, SD/TF, PD 100W', price: 180000, image_url: '', stock: 12 }
];

const insert = db.prepare('INSERT OR IGNORE INTO products (serial_number, name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)');
for (const p of sampleProducts) {
  insert.run(p.serial_number, p.name, p.description, p.price, p.image_url, p.stock);
}

console.log('Namuna tovarlar qo\'shildi!');
db.close();