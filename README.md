
🚀 Real-Time Order Execution Engine  
Event-Driven Backend • DEX Routing • BullMQ Worker • WebSocket Streaming • PostgreSQL Persistence

This project implements a complete order execution pipeline with real-time WebSocket updates, 
queue-based execution, PostgreSQL storage, Redis pub/sub, and a lightweight HTML UI for live streaming.

It fully satisfies the assignment deliverables:
- API for order creation + routing  
- WebSocket status streaming  
- Queue retries + background worker  
- Persistent event logging  
- HTML client for live updates  
- Postman collection  
- Test suite (≥10 tests)  
- Deployable to free hosting  

-------------------------
📌 Features
-------------------------
1. Order Execution API
POST /api/orders/execute  
Creates an order and pushes it to the BullMQ queue.

2. WebSocket Status Updates
ws://host/api/orders/execute?orderId=<id>

Status Stream:
pending → routing → building → submitted → confirmed

3. Background Worker (BullMQ)
Handles routing, execution simulation, retry logic, event logging, and broadcast via Redis pub/sub.

4. HTML Client (public/index.html)
Auto POST + Auto WebSocket client.
http://localhost:3000/

5. PostgreSQL Persistence
Tables: orders, order_events, order_failures

-------------------------
🧱 Tech Stack
-------------------------
Node.js, Fastify, BullMQ, Redis, PostgreSQL, WebSocket, Jest, HTML/JS

-------------------------
🗂 Project Structure
-------------------------
src/ - API, worker, services, db, utils  
public/index.html - Auto WebSocket UI  
tests/ - All test files  
scripts/ - Utilities  

-------------------------
⚙️ Installation
-------------------------
1) git clone <your-repo>
2) npm install
3) Create .env with database + redis settings
4) docker compose up -d
5) npm run dev
6) npm run worker

-------------------------
🧪 Tests
-------------------------
npm test  
Ensure server + worker are running.

-------------------------
🌐 HTML UI
-------------------------
http://localhost:3000/  
Submit order -> Auto WebSocket stream.

-------------------------
🚀 Deployment (Railway)
-------------------------
1. Push repo to GitHub  
2. Railway → New Project → Deploy from Repo  
3. Add Postgres + Redis plugins  
4. Add env variables  
5. Web service: npm run build && npm start  
6. Worker service: npm run worker  
7. Access deployed URL.

-------------------------
🎥 Demo Video Checklist
-------------------------
- Order creation  
- Live WS streaming  
- Routing decisions  
- Worker concurrency  
- DB inspection  
- 3–5 simultaneous orders  

-------------------------
🏁 Summary
-------------------------
Fully functional real-time backend engine with:
- Queue-based execution  
- Routing  
- WebSocket streaming  
- Persistent logging  
- Frontend UI  
- Full test coverage  
