# 🚀 DỰ ÁN HAZAMA DESIGN VOTE - BẢN GHI TỔNG HỢP & TÀI LIỆU NÂNG CẤP DỰ ÁN

> **Hệ thống Bình chọn & Đánh giá Mẫu Thiết kế Nội bộ Thương hiệu Hazama**
> *Cập nhật mới nhất: 03/07/2026*

---

## 📌 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

**Hazama Design Vote** là nền tảng Web App cao cấp giúp đội ngũ thiết kế, bộ phận sản xuất và nhân sự công ty Hazama cùng tham gia xem các bộ sưu tập thời trang mới, thực hiện bình chọn (Vote) và gửi các đóng góp ý kiến nội bộ mượt mà theo thời gian thực.

- **URL Production Live**: [https://hazama-design-vote.vercel.app](https://hazama-design-vote.vercel.app)
- **Công nghệ cốt lõi**:
  - **Frontend**: React (TypeScript), Vite, Vanilla CSS với thiết kế Apple Design System (Glassmorphic, HSL tailored colors).
  - **Icons**: Lucide React.
  - **Database & Sync**: Google Firebase Firestore (Chế độ Realtime Sync Cloud) kết hợp bộ nhớ đệm tự động LocalStorage Fallback.
  - **Hosting / Deployment**: Vercel CI/CD (Auto deploy khi git push `main`).

---

## 🔥 2. DANH SÁCH TÍNH NĂNG ĐÃ NÂNG CẤP & ĐẠT CHUẨN (FEATURE LIST)

### 🎨 2.1. Bảo Tồn Màu Sắc & Định Dạng Nguyên Bản (Lossless Color & Quality)
- **Vấn đề đã giải quyết**: Khắc phục tình trạng nén mờ thumbnail và biến đổi màu đỏ tươi Hazama (Color Shift / Chroma Distortion) do nén Canvas JPEG/WebP cũ.
- **Giải pháp**: 
  - Đọc trực tiếp byte dữ liệu từ đĩa cứng bằng `FileReader.readAsDataURL(file)` không thông qua Canvas resize.
  - Bảo lưu 100% **Metadata, ICC Color Profile (sRGB / Display P3 / Adobe RGB)** và kích thước Pixel gốc nguyên mẫu.
  - Hàm tải xuống `downloadSingleImageBlob(url, fileName)` sử dụng `fetch(url) -> blob() -> URL.createObjectURL(blob)` trả về chính xác 100% file gốc sắc nét.

### 📥 2.2. Dropdown Menu Tải Ảnh Dành Cho Admin (Admin Download Options)
Nút **`Tải ảnh 📥 ▾`** (chỉ hiển thị với tài khoản Admin) ở góc preview áo tích hợp Popup Dropdown Menu 3 tùy chọn:
1. 🖼️ **Tải ảnh đang xem**: Tải duy nhất file ảnh gốc sắc nét 100% của màu đang hiển thị.
2. 📦 **Tải full ảnh Mẫu này**: Tải toàn bộ tất cả ảnh biến thể màu sắc của thiết kế hiện tại (`MOCK 3`).
3. 📁 **Tải full cả Bộ sưu tập**: Tải tuần tự toàn bộ biến thể hình ảnh có trong Bộ sưu tập hiện tại.

### 🔍 2.3. Kính Lúp Hover Zoom 60fps Siêu Mượt & Khóa Cuộn Trang Mobile
- **Zero-Lag Hover Zoom (Desktop & Mobile)**:
  - Sử dụng **DOM Ref Direct Style Mutation (`transform: translate3d`)** thay vì React state re-render. Kính lúp trượt theo con trỏ chuột và đầu ngón tay lướt tức thì chuẩn **60fps - 120fps**.
- **Khóa cuộn trang thông minh trên Mobile (`touch-action: none` + `e.preventDefault()`)**:
  - Khi ngón tay dí chạm lướt trên ô hình ảnh áo, thao tác cuộn trang tự động được khóa đứng yên để tập trung 100% soi chi tiết từng đường kim mũi chỉ mà không bị trôi trang.
  - Khi ngón tay chạm ở các vùng khác, trang web cuộn mượt mà tự nhiên.

### 💬 2.4. Bình Luận Nội Bộ & Phân Quyền Ẩn Danh (Internal Feedback & Anonymous Mode)
- **Tiêu đề & Nhãn**: Đã chuẩn hóa thành **`BÌNH LUẬN`** với placeholder *"Thêm bình luận cho mẫu này..."* và thông báo khi chưa có nhận xét *"Chưa có góp ý nào. Hãy là người bóc tem sản phẩm này!"*.
- **Phân quyền bảo mật**:
  - **Voter / Viewer**: Nhìn thấy `🔒 Nhân sự ẩn danh` để giữ tính khách quan khi nhận xét.
  - **Admin**: Nhìn thấy tên thật & role `🔒 Ẩn danh (Hải Đi Zu - Designer)` để kiểm soát nội bộ.
  - **Quyền xóa**: User chỉ xóa được bình luận của chính mình. Admin có quyền xóa mọi bình luận.

### ↔️ 2.5. Điều Hướng Chuyển Ảnh Trái / Phải (`<` `>`)
- Đã gỡ bỏ khối Mặt trước / Mặt sau thừa.
- Thêm 2 nút bấm chuyển ảnh `<` và `>` nổi 3D ở 2 bên ảnh preview giúp bấm chuyển đổi giữa các góc nhìn và màu sắc nhanh chóng.
- Tự động gọi `e.stopPropagation()` để không làm trigger zoom ảo khi bấm chuyển ảnh.

### 📊 2.6. Phân Trang Apple Style (Pagination 10 mục / trang)
- Áp dụng phân trang chuẩn Apple UI cho tất cả các bảng quản trị:
  - Bảng Tất cả phiên bình chọn (`AdminOverview.tsx`)
  - Bảng Danh sách phiên bình chọn (`AdminOverview.tsx` tab Phiên)
  - Bảng Thành viên đang hoạt động (`Members.tsx`)
- Giúp hệ thống hoạt động siêu nhẹ khi số lượng dự án hoặc thành viên lên tới hàng trăm item.

### ✏️ 2.7. Sửa Trực Tiếp Phòng Ban / Role Thành Viên
- Cột *Phòng ban (Role)* trong bảng Thành viên (`Members.tsx`) được chuyển thành ô chọn `<select>` trực tiếp.
- Thay đổi role lưu tự động tức thì vào cả Firestore Cloud và LocalStorage.

### 🌀 2.8. Màn Hình Loading Spinner 360° Thực Tế
- Thay thế màn hình chờ đứng yên bằng Spinner `Loader2` xoay tròn 360° mịn màng.

---

## 🛡️ 3. BẢO VỆ DỮ LIỆU KHI DEPLOY (DATA PERSISTENCE GUARANTEE)

- **Độc lập tuyệt đối**: Dữ liệu lưu trữ nằm độc lập tại Database Google Firebase và LocalStorage.
- **An toàn khi Deploy**: Việc chỉnh sửa UI ở Localhost và deploy code mới lên Vercel **KHÔNG BAO GIỜ làm mất mát hay ảnh hưởng đến dữ liệu sản phẩm, nhân viên hay kết quả vote thực tế**.

---

## 📁 4. CẤU TRÚC THƯ MỤC CỐT LÕI (FILE STRUCTURE)

```
Website vote/
├── src/
│   ├── components/
│   │   ├── AdminLayout.tsx       # Layout khung quản trị Admin
│   │   ├── DesignCard.tsx        # Card hiển thị mẫu thiết kế
│   │   ├── Modal.tsx             # Component Modal Apple UI
│   │   ├── Pagination.tsx        # Component Phân trang 10 mục/trang
│   │   └── Toast.tsx             # Thông báo Toast mượt mà
│   ├── context/
│   │   ├── AuthContext.tsx       # Quản lý Đăng nhập & Phân quyền
│   │   └── DbContext.tsx         # Context kết nối dữ liệu Firebase / Local
│   ├── pages/
│   │   ├── AdminOverview.tsx     # Trang Tổng quan Admin & Quản lý phiên
│   │   ├── ImportDesigns.tsx     # Trang Import & Tải lên ảnh thiết kế (Lossless)
│   │   ├── LiveResults.tsx       # Trang Xem kết quả Bình chọn Realtime
│   │   ├── Login.tsx             # Trang Đăng nhập hệ thống
│   │   ├── Members.tsx           # Trang Quản lý & Inline Edit Role thành viên
│   │   ├── ReviewSession.tsx     # Trang Duyệt & Chỉnh sửa phiên
│   │   └── Vote.tsx              # Trang Bình chọn & Lookbook Modal & Kính lúp 60fps
│   ├── services/
│   │   └── db.ts                 # Service thao tác CRUD Firebase & LocalStorage
│   ├── types/
│   │   └── models.ts             # Interface TypeScript (User, Session, Design, Comment)
│   ├── App.tsx                   # Main Routing & Loader Spinner 360°
│   └── index.css                 # Apple Design System CSS & Responsive Rules
└── PROJECT_DOCUMENTATION.md     # Tài liệu lưu trữ thông tin dự án
```

---

*Ghi chú: Toàn bộ mã nguồn đã được tối ưu hóa, build thử nghiệm thành công 100% và đã deploy sẵn sàng tại [https://hazama-design-vote.vercel.app](https://hazama-design-vote.vercel.app).*
