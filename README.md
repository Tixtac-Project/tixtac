# TixTac

Nền tảng đặt vé sự kiện trực tuyến với khả năng chống tranh chấp ghế (Race Condition), tự động nhả ghế hết hạn và hàng chờ ảo (Virtual Queue) khi quá tải.

> **INT3306 — Phát triển ứng dụng web** | Spring 2026 | UET-VNU

---

## Tính năng chính

| Tính năng            | Mô tả                                                      |
| -------------------- | ---------------------------------------------------------- |
| Sơ đồ ghế trực quan  | Ma trận ghế clickable, cập nhật màu realtime qua SSE       |
| Chống tranh chấp ghế | Database Transaction + Row Lock (`SELECT ... FOR UPDATE`)  |
| Tự động nhả ghế      | Ghế chưa thanh toán sau 10 phút → tự nhả qua Message Queue |
| Hàng chờ ảo          | Khi quá tải → đẩy vào Waiting Room, lần lượt cấp quyền vào |
| Vé điện tử QR Code   | Sau thanh toán → nhận QR Code cho từng ghế                 |
| Dashboard realtime   | Doanh thu, tỉ lệ lấp đầy, demographics khán giả            |

---

## Tech Stack

| Layer         | Công nghệ                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------- |
| Runtime       | [Bun](https://bun.sh/)                                                                    |
| Framework     | [SvelteKit](https://kit.svelte.dev/)                                                      |
| UI            | [TailwindCSS](https://tailwindcss.com/) + [shadcn-svelte](https://www.shadcn-svelte.com/) |
| Database      | [Neon](https://neon.tech/) (PostgreSQL) ☁️                                                |
| ORM           | [DrizzleORM](https://orm.drizzle.team/)                                                   |
| Message Queue | [CloudAMQP](https://www.cloudamqp.com/) (LavinMQ) ☁️                                      |
| Auth          | JWT (httpOnly cookie) - SSR Auth                                                          |
| Realtime      | Server-Sent Events (SSE)                                                                  |
| Deploy        | [Render](https://render.com/) ☁️                                                          |

---

## 📁 Cấu trúc dự án

```

src/
├── routes/
│ ├── (admin)/admin/ # Admin pages (dashboard, events)
│ ├── (customer)/ # Customer pages (events, seats, checkout)
│ ├── login/ & register/
│ └── api/ # API routes
│ ├── auth/ # register, login, logout
│ ├── events/ # CRUD, seats, hold, SSE, queue
│ ├── orders/ # checkout
│ ├── me/ # my tickets
│ └── stats/ # revenue, occupancy, demographics
├── lib/
│ ├── server/
│ │ ├── db/ # Drizzle schema, client, seed
│ │ ├── auth/ # JWT, password hashing
│ │ ├── mq/ # AMQP producer, consumer
│ │ ├── sse/ # EventBus (seat updates)
│ │ ├── services/ # Business logic
│ │ └── errors.ts # AppError class
│ ├── components/ # Svelte components
│ │ └── ui/ # shadcn-svelte
│ ├── stores/ # Svelte stores
│ └── utils/
│ ├── api.ts # Fetch wrapper
│ ├── format.ts # Currency, date formatters
│ └── constants.ts
├── hooks.server.ts # Auth middleware
└── app.d.ts # Type declarations

```

---

## 🚀 Cài đặt & chạy

### Yêu cầu

- [Bun](https://bun.sh/) (hoặc npm/pnpm)

### 1. Clone & Install

```bash
git clone https://github.com/Tixtac-Project/tixtac.git
cd tixtac
bun install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
```

Mở `.env` và điền thông tin:

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/ticketrush?sslmode=require

# Message Queue (CloudAMQP -> LavinMQ)
AMQP_URL=amqps://user:pass@rattlesnake.rmq.cloudamqp.com/vhost

# Auth
JWT_SECRET=your-super-secret-key-here

# Business Config
SEAT_LOCK_DURATION=600         # giây (10 phút)
MAX_CONCURRENT_USERS=200       # ngưỡng virtual queue
```

### 3. Database Migration & Seed

```bash
# Chạy migration
bun run db:migrate

# Seed dữ liệu mẫu
bun run db:seed
```

### 4. Chạy dev server

```bash
bun run dev
```

Mở [http://localhost:5173](http://localhost:5173)

---

## Tài khoản demo

| Email               | Password | Role     |
| ------------------- | -------- | -------- |
| admin@ticketrush.vn | 123456   | Admin    |
| alice@gmail.com     | 123456   | Customer |
| bob@gmail.com       | 123456   | Customer |

---

## API Endpoints

### Public

| Method | Endpoint             | Mô tả                |
| ------ | -------------------- | -------------------- |
| POST   | `/api/auth/register` | Đăng ký              |
| POST   | `/api/auth/login`    | Đăng nhập            |
| POST   | `/api/auth/logout`   | Đăng xuất            |
| GET    | `/api/events`        | Danh sách + tìm kiếm |
| GET    | `/api/events/[id]`   | Chi tiết sự kiện     |

### Customer (Auth Required)

| Method | Endpoint                        | Mô tả            |
| ------ | ------------------------------- | ---------------- |
| GET    | `/api/events/[id]/seats`        | Sơ đồ ghế        |
| GET    | `/api/events/[id]/seats/stream` | SSE realtime     |
| POST   | `/api/events/[id]/seats/hold`   | Giữ chỗ          |
| POST   | `/api/orders/[id]/checkout`     | Thanh toán       |
| GET    | `/api/me/tickets`               | Vé của tôi       |
| POST   | `/api/events/[id]/queue`        | Đăng ký hàng chờ |
| GET    | `/api/events/[id]/queue`        | Check lượt       |

### Admin (Auth Required)

| Method | Endpoint                  | Mô tả         |
| ------ | ------------------------- | ------------- |
| POST   | `/api/events`             | Tạo sự kiện   |
| GET    | `/api/stats/revenue`      | Doanh thu     |
| GET    | `/api/stats/occupancy`    | Tỉ lệ lấp đầy |
| GET    | `/api/stats/demographics` | Demographics  |

---

## Kiến trúc

```
Browser
  │
  ├── Pages (SSR + CSR)
  ├── SSE Connection ◄──── realtime seat updates
  └── Fetch API ──────────────────────────────┐
                                              │
                                              ▼
SvelteKit Server (Render.com)
  ├── hooks.server.ts ──── Auth (JWT verify)
  ├── API Routes ─────────── Parse + Respond
  ├── Service Layer ──────── Business Logic
  │     ├── Row Lock ─────── FOR UPDATE
  │     ├── MQ Producer ──── Delayed message
  │     └── SSE Emit ─────── EventBus
  └── Infrastructure
        ├── DrizzleORM ────── Neon PostgreSQL ☁️
        ├── AMQP Client ───── CloudAMQP ☁️
        └── EventEmitter ──── In-memory SSE bus
```

---

## 🧪 Scripts

```bash
bun run dev          # Dev server
bun run build        # Production build
bun run preview      # Preview production build
bun run check        # TypeScript check
bun run lint         # ESLint
bun run format       # Prettier format
bun run db:migrate   # Run migrations
bun run db:seed      # Seed sample data
bun run db:studio    # Open Drizzle Studio
```

---

## Demo nhanh

```
1. Admin đăng nhập → Tạo sự kiện "Rock Festival" (2 khu ghế)
2. Customer A đăng nhập → Xem sự kiện → Chọn ghế → Thanh toán → QR Code
3. Race Condition: 2 tab cùng click 1 ghế → 1 được, 1 bị từ chối
4. Nhả ghế: Giữ ghế, không thanh toán → chờ hết hạn → ghế xanh lại
5. Virtual Queue: Set MAX=3, mở 4 tab → tab 4 vào Waiting Room
6. Admin xem Dashboard → Charts realtime
```

**Biến env cho demo nhanh:**

```env
SEAT_LOCK_DURATION=60          # 1 phút thay vì 10
MAX_CONCURRENT_USERS=3         # Dễ trigger virtual queue
```

---

## 👥 Nhóm

| Thành viên            | GitHub                                              |
| --------------------- | --------------------------------------------------- |
| Nguyễn Đức Dũng       | [@DungxND](https://github.com/username)             |
| Nguyễn Đức Hưng       | [@HungND-flocus](https://github.com/HungND-flocus)  |
| Nguyễn Văn Thanh Tùng | [@TugNguyen](https://github.com/NguyenVanThanhTung) |

---

## 📄 Tài liệu

| Tài liệu            | Link                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Yêu cầu & Nghiệp vụ | [Notion](https://tixtac.notion.site/Y-u-c-u-Nghi-p-v-33a7b684490780d4ba8efdb8b66e3afa)       |
| Kiến trúc & CSDL    | [Notion](https://tixtac.notion.site/Thi-t-k-ki-n-tr-c-CSDL-33a7b6844907805f81a3e8fd254b364c) |
| Code Convention     | [Notion](https://tixtac.notion.site/Quy-chu-n-code-33a7b684490780eb9059d90421f448b4)         |
| Project Plan        | [Github Project](https://github.com/orgs/Tixtac-Project/projects/1)                          |
