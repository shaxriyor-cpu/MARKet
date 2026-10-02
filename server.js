const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'market.db'));
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'shaxa0711';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'market-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect('/admin/login');
};

function formatPrice(price) {
  return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
}

app.locals.formatPrice = formatPrice;

app.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE stock > 0 ORDER BY created_at DESC').all();
  res.render('index', { products, cart: req.session.cart || [] });
});

app.get('/product/:serial', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE serial_number = ?').get(req.params.serial);
  if (!product) return res.status(404).render('404');
  res.render('product', { product, cart: req.session.cart || [] });
});

app.post('/cart/add', (req, res) => {
  const { serial } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE serial_number = ? AND stock > 0').get(serial);
  if (!product) return res.redirect('/?error=notfound');

  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(item => item.serial === serial);
  if (existing) {
    existing.qty += 1;
  } else {
    req.session.cart.push({ serial, name: product.name, price: product.price, qty: 1 });
  }
  res.redirect('/?success=added');
});

app.post('/cart/remove', (req, res) => {
  const { serial } = req.body;
  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(item => item.serial !== serial);
  }
  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  res.render('cart', { cart, total });
});

app.get('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  res.render('checkout', { cart, total });
});

app.post('/order', (req, res) => {
  const { telegram_username } = req.body;
  const cart = req.session.cart || [];
  if (cart.length === 0 || !telegram_username) {
    return res.redirect('/checkout?error=missing');
  }

  const insertOrder = db.prepare('INSERT INTO orders (product_serial, product_name, product_price, telegram_username) VALUES (?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE products SET stock = stock - 1 WHERE serial_number = ?');

  const transaction = db.transaction((items) => {
    for (const item of items) {
      insertOrder.run(item.serial, item.name, item.price, telegram_username);
      updateStock.run(item.serial);
    }
  });

  try {
    transaction(cart);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    req.session.cart = [];
    res.render('receipt', { 
      cart, 
      total, 
      telegram_username,
      seller_telegram: '@shaxriyor_ablazizov'
    });
  } catch (e) {
    console.error(e);
    res.redirect('/checkout?error=failed');
  }
});

app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin-login', { error: req.query.error });
});

app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.redirect('/admin/login?error=1');
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/admin', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.render('admin', { products, orders });
});

app.post('/admin/product/add', requireAdmin, (req, res) => {
  const { serial_number, name, description, price, stock } = req.body;
  const insert = db.prepare('INSERT INTO products (serial_number, name, description, price, stock) VALUES (?, ?, ?, ?, ?)');
  try {
    insert.run(serial_number, name, description || '', parseInt(price), parseInt(stock) || 1);
    res.redirect('/admin?success=added');
  } catch (e) {
    res.redirect('/admin?error=duplicate');
  }
});

app.post('/admin/product/delete', requireAdmin, (req, res) => {
  const { id } = req.body;
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.redirect('/admin');
});

app.post('/admin/order/update', requireAdmin, (req, res) => {
  const { id, status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  res.redirect('/admin');
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/login`);
  console.log(`Admin parol: ${ADMIN_PASSWORD}`);
});