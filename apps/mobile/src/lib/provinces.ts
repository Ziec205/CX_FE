// 34 tỉnh/thành sau sắp xếp đơn vị hành chính 2025 (tài liệu 01, L13).
// Tạm đặt ở FE; nên chuyển thành danh mục do BE quản lý (collection provinces) kèm danh sách phường/xã.
export const PROVINCES: { id: string; name: string }[] = [
  ["ha-noi", "Hà Nội"], ["tp-ho-chi-minh", "TP. Hồ Chí Minh"], ["hai-phong", "Hải Phòng"], ["da-nang", "Đà Nẵng"], ["can-tho", "Cần Thơ"], ["hue", "Huế"],
  ["an-giang", "An Giang"], ["bac-ninh", "Bắc Ninh"], ["ca-mau", "Cà Mau"], ["cao-bang", "Cao Bằng"], ["dak-lak", "Đắk Lắk"], ["dien-bien", "Điện Biên"],
  ["dong-nai", "Đồng Nai"], ["dong-thap", "Đồng Tháp"], ["gia-lai", "Gia Lai"], ["ha-tinh", "Hà Tĩnh"], ["hung-yen", "Hưng Yên"], ["khanh-hoa", "Khánh Hòa"],
  ["lai-chau", "Lai Châu"], ["lam-dong", "Lâm Đồng"], ["lang-son", "Lạng Sơn"], ["lao-cai", "Lào Cai"], ["nghe-an", "Nghệ An"], ["ninh-binh", "Ninh Bình"],
  ["phu-tho", "Phú Thọ"], ["quang-ngai", "Quảng Ngãi"], ["quang-ninh", "Quảng Ninh"], ["quang-tri", "Quảng Trị"], ["son-la", "Sơn La"], ["tay-ninh", "Tây Ninh"],
  ["thai-nguyen", "Thái Nguyên"], ["thanh-hoa", "Thanh Hóa"], ["tuyen-quang", "Tuyên Quang"], ["vinh-long", "Vĩnh Long"],
].map(([id, name]) => ({ id, name }));

export const provinceName = (id?: string | null) => PROVINCES.find((p) => p.id === id)?.name ?? id ?? "";
