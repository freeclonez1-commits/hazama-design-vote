export interface ParseResult {
  valid: boolean;
  designNumber?: string;
  color?: string;
  view?: 'f' | 'b';
  ext?: string;
  reason?: string;
}

export const ALLOWED_COLORS = [
  'black',
  'white',
  'grey',
  'navy',
  'beige',
  'red',
  'blue',
  'green',
  'brown',
  'pink',
  'purple',
  'yellow',
  'orange'
];

export const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export function parseFileName(fileName: string): ParseResult {
  // Normalize by stripping path, trimming, and converting to lowercase
  const nameOnly = fileName.split('/').pop()?.split('\\').pop() || fileName;
  const parts = nameOnly.trim().split('.');
  if (parts.length < 2) {
    return {
      valid: false,
      reason: `Định dạng không hợp lệ. Sử dụng định dạng: [designNumber]-[color]-[view].[ext] (Ví dụ: 01-black-f.png)`
    };
  }

  const ext = parts.pop()?.toLowerCase() || '';
  const baseName = parts.join('.');

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      reason: `Định dạng file không được hỗ trợ (.${ext}). Chỉ cho phép: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // Split baseline by hyphen
  const nameParts = baseName.split('-');
  if (nameParts.length !== 3) {
    // Try to guess common mistakes to give a helpful reason
    if (baseName.includes(' ')) {
      return {
        valid: false,
        reason: `Tên file sử dụng khoảng trắng thay vì dấu gạch ngang (-). Sử dụng định dạng: 01-black-f.${ext}`
      };
    }
    if (nameParts.length < 3) {
      return {
        valid: false,
        reason: `Thiếu thành phần. Định dạng chuẩn: [MãSố]-[Màu]-[Mặt]. Ví dụ: 01-black-f.${ext}`
      };
    }
    return {
      valid: false,
      reason: `Định dạng không khớp. Cần đúng 3 phần ngăn cách bởi dấu gạch ngang (ví dụ: 01-black-f.${ext})`
    };
  }

  const [designNumberStr, colorRaw, viewRaw] = nameParts;

  // 1. Validate designNumber (must be exactly 2 digits)
  if (!/^\d{2}$/.test(designNumberStr)) {
    return {
      valid: false,
      reason: `Mã số thiết kế phải là 2 chữ số (ví dụ: 01, 02...). Bạn đang để: "${designNumberStr}"`
    };
  }

  // 2. Validate color (must be in the list of allowed colors)
  const color = colorRaw.toLowerCase();
  if (!ALLOWED_COLORS.includes(color)) {
    return {
      valid: false,
      reason: `Màu "${colorRaw}" không được hỗ trợ. Chỉ dùng các màu: ${ALLOWED_COLORS.join(', ')}`
    };
  }

  // 3. Validate view (must be f or b)
  const view = viewRaw.toLowerCase();
  if (view !== 'f' && view !== 'b') {
    return {
      valid: false,
      reason: `Mặt hiển thị là "${viewRaw}" không hợp lệ. Chỉ chấp nhận 'f' (front - trước) hoặc 'b' (back - sau)`
    };
  }

  return {
    valid: true,
    designNumber: designNumberStr,
    color,
    view: view as 'f' | 'b',
    ext
  };
}

/**
 * Format design code based on date and design number
 * @param dateStr ISO date string or short format
 * @param designNumber 2-digit string
 */
export function generateDesignCode(dateStr: string, designNumber: string): string {
  const date = new Date(dateStr);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `HZ-${yy}${mm}${dd}-${designNumber}`;
}
