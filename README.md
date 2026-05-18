# **THE COURSE PROJECT HAS BEEN ENDED.**

**THE CONTINUATION OF THIS PROJECT IS PRIVATE**

## **IF YOU USE THIS PROJECT/CODE. DO MENTION THE AUTHORS. AND YOU MUST NOT USE ANY OF OUR BRANDING/ASSETS.**

> **COURSE END COMMENT:** While this project has fully satisfied the requirements of the course request, it still has some tech debt: inconsistent code style, function usage, and maybe some unknown edge cases.
>
> - **Techstack**: The DX is nice, despite the immaturity of some libraries (Drizzle, Bun), but it may not be the most stable/reliable stack for a production system but it is promising and fun to work with for a course project.

<br>

# TixTac

Nền tảng đặt vé sự kiện trực tuyến với khả năng chống tranh chấp ghế (Race Condition), tự động nhả ghế hết hạn và hàng chờ ảo (Virtual Queue) khi quá tải.

> **INT3306 — Phát triển ứng dụng web** | Spring 2026 | UET-VNU

---

## Tính năng chính

| Tính năng            | Mô tả                                                       |
| -------------------- | ----------------------------------------------------------- |
| Sơ đồ ghế trực quan  | Ma trận ghế clickable, cập nhật trạng thái realtime qua SSE |
| Chống tranh chấp ghế | Database Transaction + Row Lock (`SELECT ... FOR UPDATE`)   |
| Tự động nhả ghế      | Ghế chưa thanh toán sau 10 phút → tự nhả qua Message Queue  |
| Hàng chờ ảo          | Khi quá tải → đẩy vào Waiting Room, lần lượt cấp quyền vào  |
| Vé điện tử QR Code   | Sau thanh toán → nhận QR Code cho từng ghế                  |
| Dashboard realtime   | Doanh thu, tỉ lệ lấp đầy, demographics khán giả             |

---

## Tech Stack

| Layer            | Công nghệ                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Runtime          | [Bun](https://bun.sh/)                                                                    |
| Framework        | [SvelteKit](https://kit.svelte.dev/)                                                      |
| UI               | [TailwindCSS](https://tailwindcss.com/) + [shadcn-svelte](https://www.shadcn-svelte.com/) |
| Database         | [Neon](https://neon.tech/) (PostgreSQL) ☁️                                                |
| ORM              | [DrizzleORM](https://orm.drizzle.team/)                                                   |
| Message Queue    | [CloudAMQP](https://www.cloudamqp.com/) (RabbitMQ) ☁️                                     |
| Auth             | Jose JWT (httpOnly cookie) - SSR Auth                                                     |
| Realtime         | Server-Sent Events (SSE)                                                                  |
| Validation       | [Zod](https://zod.dev/) (shared FE/BE schemas)                                            |
| Seat Map Builder | [Konva](https://konvajs.org/) (svelte-konva)                                              |
| Deploy           | [Render](https://render.com/) ☁️                                                          |

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

- [Bun](https://bun.sh/) - Không dùng NodeJS vì dự án phụ thuộc vào một số tính năng chỉ có trên Bun.
- Tài khoản Neon, CloudAMQP, Upstash Redis, Resend (xem hướng dẫn bên dưới)

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

#### Hướng dẫn lấy các thông tin cần thiết cho `.env`

Mở file `.env` và điền các thông tin sau:

- **DATABASE_URL (Neon PostgreSQL):**
  Đăng ký tại [Neon.tech](https://neon.tech) -> Tạo Project -> Copy chuỗi kết nối (Connection string), nhớ bật "Connection pooling"
- **CLOUDAMQP_URL (RabbitMQ):**
  Đăng ký tại [CloudAMQP](https://www.cloudamqp.com) -> Tạo instance RabbitMQ -> Copy chuỗi AMQP URL.
- **JWT_SECRET:**
  Chuỗi bảo mật để ký token. Mở terminal chạy lệnh `bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex'))"` và copy kết quả vào.
- **VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY_JWK (Web Push Keys):**
  Mở terminal chạy lệnh `bunx @pushforge/builder vapid`. Copy giá trị `VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY_JWK` từ màn hình kết quả dán tương ứng vào `.env`.
- **UPSTASH_REDIS (Queue & Cache):**
  Đăng ký tại [Upstash.com](https://upstash.com) -> Tạo Redis Database -> Copy `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.
- **Virtual Queue (Cấu hình hàng chờ):**
  - `QUEUE_DEFAULT_EVENT_CAP`: Giới hạn người vào thẳng khi hệ thống chưa tính toán xong (mặc định 10).
  - `QUEUE_MAX_EVENT_CAP`: Giới hạn tối đa cho một sự kiện, kể cả khi sự kiện đó còn rất nhiều vé (mặc định 200).
  - `QUEUE_DYNAMIC_CAP_RATIO`: Tỉ lệ cấp quyền vào dựa trên số ghế còn lại (ví dụ 0.1 = cho phép 10% số ghế còn lại vào Active cùng lúc).
  - `QUEUE_WAITING_CAP_RATIO`: Tỷ lệ giới hạn độ dài hàng chờ dựa trên sức chứa hiện tại (mặc định 2). Ví dụ: Nếu sự kiện đang cho phép 100 người chọn ghế, thì tối đa 200 người được phép đứng đợi. Người vượt quá giới hạn này sẽ nhận thông báo "Hàng chờ đã đầy".
- **RESEND_API_KEY (Email):**
  Đăng ký tại [Resend.com](https://resend.com) -> Mục API Keys -> Create API Key.
- **GEO_API_KEY (Optional):**
  Đăng ký tại [ipgeolocation.io](https://ipgeolocation.io) -> Sign Up -> API Keys. Email đặt lại mật khẩu sẽ hiển thị thành phố/quốc gia của người yêu cầu.
- **WEB3FORMS_KEY (Optional):**
  Đăng ký tại [Web3Forms.com](https://web3forms.com) -> Dashboard -> Access Key. Key này có thể công khai.

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

| Email              | Password | Role  |
| ------------------ | -------- | ----- |
| admin@tixtac.io.vn | 12345678 | Admin |

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

## 👥 Nhóm

| Thành viên            | GitHub                                              |
| --------------------- | --------------------------------------------------- |
| Nguyễn Đức Dũng       | [@DungxND](https://github.com/username)             |
| Nguyễn Đức Hưng       | [@HungND-flocus](https://github.com/HungND-flocus)  |
| Nguyễn Văn Thanh Tùng | [@TugNguyen](https://github.com/NguyenVanThanhTung) |

---

## 📄 Tài liệu

| Tài liệu            | Link                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------- |
| Yêu cầu & Nghiệp vụ | [Notion](https://tixtac.notion.site/Y-u-c-u-Nghi-p-v-33a7b684490780d4ba8efdb8b66e3afa) |
| Kiến trúc & CSDL    | [Github Wiki](https://github.com/Tixtac-Project/tixtac/wiki/Architecture)              |
| Code Convention     | [Notion](https://tixtac.notion.site/Quy-chu-n-code-33a7b684490780eb9059d90421f448b4)   |
| Project Plan        | [Github Project](https://github.com/orgs/Tixtac-Project/projects/1)                    |
