const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = "vacuumstore_super_secret_2026_key_long_and_secure";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ users: [], products: [], orders: [] }).write();

// Middleware kiểm tra Admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    if (decoded.role !== "admin") return res.status(403).json({ message: "Chỉ admin mới được truy cập" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// ====================== AUTH ======================
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (db.get('users').find({ email }).value()) return res.status(400).json({ message: "Email đã tồn tại!" });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: Date.now(), name, email, phone, password: hashed, role: "user", createdAt: new Date().toISOString() };
  db.get('users').push(user).write();
  res.json({ message: "Đăng ký thành công!" });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email }).value();
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Email hoặc mật khẩu sai!" });

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || "user" }, SECRET_KEY, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role || "user" } });
});

// ====================== PRODUCTS ======================
app.get('/api/products', (req, res) => res.json(db.get('products').value()));

app.post('/api/products', verifyAdmin, (req, res) => {
  const product = { id: Date.now(), ...req.body };
  db.get('products').push(product).write();
  res.json(product);
});

app.put('/api/products/:id', verifyAdmin, (req, res) => {
  const products = db.get('products').value();
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Không tìm thấy" });
  products[index] = { ...products[index], ...req.body };
  db.get('products').write();
  res.json(products[index]);
});

app.delete('/api/products/:id', verifyAdmin, (req, res) => {
  db.get('products').remove({ id: parseInt(req.params.id) }).write();
  res.json({ message: "Đã xóa" });
});

// Seed 50 sản phẩm
app.get('/api/seed', (req, res) => {
  if (db.get('products').value().length === 0) {
    const products50 = [/* dán 50 sản phẩm fallbackProducts từ product.html vào đây */];
    db.get('products').push(...products50).write();
    res.json({ message: "Đã seed 50 sản phẩm!" });
  } else res.json({ message: "Đã có dữ liệu" });
});

// ====================== ORDERS ======================
app.post('/api/orders', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let customer = { name: "Khách vãng lai" };
  if (token) {
    try { customer = jwt.verify(token, SECRET_KEY); } catch(e) {}
  }
  const order = { id: "#VS" + Date.now().toString().slice(-8), customer: customer.name, ...req.body, date: new Date().toISOString().slice(0,10), status: "Đang xử lý", shipper: null };
  db.get('orders').push(order).write();
  res.json({ success: true, order });
});

app.get('/api/orders', verifyAdmin, (req, res) => res.json(db.get('orders').value()));

app.put('/api/orders/:id', verifyAdmin, (req, res) => {
  const orders = db.get('orders').value();
  const index = orders.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: "Không tìm thấy" });
  orders[index] = { ...orders[index], ...req.body };
  db.get('orders').write();
  res.json(orders[index]);
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});