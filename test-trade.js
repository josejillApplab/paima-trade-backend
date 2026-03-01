const axios = require('axios');

async function test() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlcjEiLCJpYXQiOjE3NzIyMjUwODMsImV4cCI6MTc3MjgyOTg4M30.XHYeNn5ndXNvOrdGpC6fWBS62zpieFXogC7IcOGPtw4";

  console.log("=== GET /api/auth/me ===");
  try {
     const me = await axios.get('http://localhost:3001/api/auth/me', { headers: { Authorization: `Bearer ${token}` }});
     console.log(me.data);
  } catch(e) { console.log(e.response?.data || e.message) }

  console.log("\n=== GET /api/leaderboard ===");
  try {
     const lb = await axios.get('http://localhost:3001/api/leaderboard', { headers: { Authorization: `Bearer ${token}` }});
     console.log(lb.data);
  } catch(e) { console.log(e.response?.data || e.message) }

}
test();
