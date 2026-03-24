const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: '00000000-0000-0000-0000-000000000000', phone: '1234567890', user_type: 'customer' }, process.env.JWT_SECRET);

axios.post('http://localhost:5000/api/profile/request-update', { tradeName: 'Test' }, {
  headers: {
    Authorization: `Bearer ${token}`
  }
}).then(res => {
  console.log("SUCCESS:", res.data);
}).catch(err => {
  console.log("ERROR STATUS:", err.response?.status);
  console.log("ERROR DATA:", err.response?.data);
});
