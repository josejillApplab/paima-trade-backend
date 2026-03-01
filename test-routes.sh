#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0dXNlcjEiLCJpYXQiOjE3NzIyMjUwODMsImV4cCI6MTc3MjgyOTg4M30.XHYeNn5ndXNvOrdGpC6fWBS62zpieFXogC7IcOGPtw4"

echo "=== Testing /api/auth/me ==="
curl -s -X GET http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"
echo -e "\n\n=== Testing /api/portfolio ==="
curl -s -X GET http://localhost:3001/api/portfolio -H "Authorization: Bearer $TOKEN"
echo -e "\n\n=== Testing /api/trade (BUY 5 NIFTY50 @ 22000) ==="
curl -s -X POST http://localhost:3001/api/trade -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"symbol":"NIFTY50", "type":"buy", "quantity":5, "price":22000}'
echo -e "\n\n=== Testing /api/portfolio (After Trade) ==="
curl -s -X GET http://localhost:3001/api/portfolio -H "Authorization: Bearer $TOKEN"
echo -e "\n\n=== Testing /api/trade/history ==="
curl -s -X GET http://localhost:3001/api/trade/history -H "Authorization: Bearer $TOKEN"
echo -e "\n\n=== Testing /api/leaderboard ==="
curl -s -X GET http://localhost:3001/api/leaderboard -H "Authorization: Bearer $TOKEN"
echo ""
