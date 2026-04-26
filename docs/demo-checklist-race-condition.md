# Demo Checklist: Race Condition - No Duplicate Seat Sales

**Thời gian:** 2 phút
**Mục tiêu:** Chứng minh hệ thống tuyệt đối không bán trùng ghế khi nhiều người cùng thao tác đồng thời
**NFR:** NFR-01

---

## 🛠️ Chuẩn bị (Trước demo)

- [ ] 2 browser đã mở sẵn:
  - **Browser A (Alice):** Chrome thường
  - **Browser B (Bob):** Incognito window hoặc Firefox/Edge khác
- [ ] Login với 2 tài khoản customer khác nhau:
  - Alice: `alice1@gmail.com` / `12345678`
  - Bob: `alice2@gmail.com` / `12345678`
- [ ] Cả 2 cùng trỏ đến 1 event có sơ đồ ghế rõ ràng
  - VD: `/events/1/shows/1/seats`
- [ ] Chọn 1 ghế chung để test (VD: VIP-A1 hoặc A1)
  - Cả 2 tab đều thấy ghế này ở trạng thái **xanh** (available)

---

## 🎯 Kịch bản 1: 2 người cùng hold 1 ghế

### Thực hiện

1. **Alice** chọn ghế VIP-A1 → click **"Giữ chỗ"**
2. **Bob** chọn cùng ghế VIP-A1 → click **"Giữ chỗ"**
3. Đếm **"3... 2... 1"** → cả 2 bấm gần như cùng lúc

### Kết quả mong đợi

| Người dùng | Kết quả | Trạng thái |
|------------|---------|------------|
| **Alice** (hoặc Bob) | ✅ 201 OK | Redirect đến `/checkout/[order_id]` |
| **Bob** (hoặc Alice) | ❌ 409 Conflict | Toast: "Ghế đã được người khác chọn" |
| Tab thất bại | - | Sơ đồ ghế refresh, ghế đổi **đỏ** |

### Kiểm tra database

```sql
-- Chỉ 1 seat bị lock
SELECT id, status, locked_by FROM seats WHERE id = <seat_id>;

-- Chỉ 1 order pending
SELECT id, user_id, status FROM orders WHERE status = 'pending';
```

### Checklist

- [ ] 1 tab nhận 201 → redirect checkout
- [ ] 1 tab nhận 409 → toast lỗi
- [ ] Tab thất bại: sơ đồ refresh, ghế đỏ
- [ ] Database: chỉ 1 seat locked
- [ ] Database: chỉ 1 order pending

---

## 🎯 Kịch bản 2: Chọn 3 ghế, 1 ghế bị lock giữa chừng (Tính Atomic)

### Thực hiện

1. **Bob** chọn 1 ghế (VD: VIP-B1) → **"Giữ chỗ"** → thành công ✅
2. **Alice** chọn 3 ghế cùng khu (VIP-A1, VIP-A2, VIP-A3) → **"Giữ chỗ"**

### Kết quả mong đợi

| Người dùng | Kết quả | Chi tiết |
|------------|---------|----------|
| **Bob** | ✅ 201 OK | Giữ ghế VIP-B1 thành công |
| **Alice** | ❌ 409 Conflict | Toast: "Ghế đã được người khác chọn" |

### QUAN TRỌNG: Kiểm tra tính Atomic

```sql
-- Kiểm tra các ghế của Alice
SELECT id, status FROM seats WHERE id IN (<A1_id>, <A2_id>, <A3_id>);
```

**Kết quả đúng:**
- `VIP-A1`: status = `'available'` ✅
- `VIP-A2`: status = `'available'` ✅
- `VIP-A3`: status = `'available'` ✅

**Kết quả sai (không xảy ra):**
- Nếu có ghế nào bị `'locked'` → **LỖI NGHIÊM TRỌNG**

### Checklist

- [ ] Bob giữ ghế thành công
- [ ] Alice nhận lỗi 409
- [ ] VIP-A1 vẫn available (không bị lock)
- [ ] VIP-A2 vẫn available (không bị lock)
- [ ] VIP-A3 vẫn available (không bị lock)

---

## 🎯 Kịch bản 3: 2 tab cùng checkout 1 order

### Thực hiện

1. **Alice** tạo order mới (hold ghế thành công)
2. Copy URL checkout: `/orders/[order_id]/checkout`
3. **Mở URL đó trong 1 tab mới** (Alice có 2 tab cùng order)
4. Cả 2 tab cùng bấm **"Xác nhận thanh toán"**

### Kết quả mong đợi

| Tab | Kết quả | Trạng thái |
|-----|---------|------------|
| Tab 1 | ✅ 200 OK | Thanh toán thành công |
| Tab 2 | ❌ 400 ORDER_NOT_PENDING | Order đã paid rồi |

### Checklist

- [ ] 1 tab: 200 OK (paid thành công)
- [ ] 1 tab: 400 ORDER_NOT_PENDING
- [ ] Database: order status = `'paid'`
- [ ] Database: seat status = `'sold'`

---

## 🔧 Chạy Test Tự động

### Reset dữ liệu test

```bash
bun run scripts/reset-test-data.ts
```

### Chạy race condition tests

```bash
bun run scripts/test-race.ts
```

### Kết quả mong đợi

```
═══════════════════════════════════════════════════════════════
  Race Condition Tests - NFR-01: No Duplicate Seat Sales
═══════════════════════════════════════════════════════════════

📋 Test 1: 2 users hold same seat simultaneously
  Alice response: 201
  Bob response: 409
  Success: 1, Conflict: 1
  Seat 101 status: locked
  ✅ PASSED

📋 Test 2: Hold 3 seats, 1 locked → atomic fail (no partial lock)
  Bob holds seat 102: 201
  Alice tries to hold seats [101, 102, 103]: 409
  Seat 101 before: available, after: available
  Seat 102 before: locked, after: locked
  Seat 103 before: available, after: available
  ✅ PASSED

📋 Test 3: N concurrent requests on same seat → exactly 1 success
  Total requests: 10
  Success (201): 1
  Conflict (409): 9
  Seat 201 status: locked
  ✅ PASSED

📋 Test 4: 2 tabs checkout same order → only 1 succeeds
  Tab 1 response: 200
  Tab 2 response: 400
  Paid: 1, Rejected: 1
  Seat 301 status: sold
  ✅ PASSED

═══════════════════════════════════════════════════════════════
  Summary
═══════════════════════════════════════════════════════════════
✅ Test 1: 2 users hold same seat
✅ Test 2: Atomic partial lock prevention
✅ Test 3: N concurrent requests
✅ Test 4: Checkout race condition

Total: 4/4 passed

🎉 All tests passed! NFR-01 verified.
```

---

## ⚠️ Lưu ý quan trọng

1. **Test trên database thật (Neon)**: Không mock dữ liệu
2. **Promise.all không đảm bảo đồng thời tuyệt đối**: Nhưng đủ để trigger row lock contention trong PostgreSQL
3. **Connection pool**: Nếu dùng pool size nhỏ (1-2), requests sẽ bị serialize. Cần pool size >= số concurrent requests
4. **Chạy reset script trước mỗi test**: Đảm bảo trạng thái sạch

---

## 📊 Tổng kết

| Tiêu chí | Kết quả |
|----------|---------|
| 2 users hold same seat → 1 success, 1 conflict | ✅ |
| Atomic fail - no partial lock | ✅ |
| N concurrent requests → 1 success, N-1 conflicts | ✅ |
| Concurrent checkout → 1 paid, 1 rejected | ✅ |
| No duplicate seat locks | ✅ |
| No data corruption | ✅ |