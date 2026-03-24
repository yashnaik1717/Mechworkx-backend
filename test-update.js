const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  const token = jwt.sign({ id: '08157320-f699-4a2e-9fef-6666ed400fa87', user_type: 'customer', phone: '1234567890' }, process.env.JWT_SECRET);
  const fd = new FormData();
  fd.append('tradeName', 'Testing');
  
  try {
    const res = await fetch('http://localhost:5000/api/profile/request-update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    console.log("STATUS:", res.status);
    console.log("BODY:", await res.text());
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
run();
