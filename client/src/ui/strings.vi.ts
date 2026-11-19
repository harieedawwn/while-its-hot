/** The ONLY place for player-facing Vietnamese text. Each phase adds its own keys. */
export const STR = {
  gate: { rotate: 'Xoay ngang điện thoại' },
  /** Graphics settings (LOOK §1); the ledger UI arrives in phase 14. */
  gfx: {
    resolution: 'Độ phân giải điểm ảnh', native: 'Gốc',
    quantize: 'Nén màu', quantOff: 'Tắt', quantLight: 'Nhẹ', quantStrong: 'Mạnh',
    snap: 'Rung đỉnh',
  },
  /** Touch layout editor (Điều khiển → Chỉnh bố cục). Game buttons carry pictograms only, never text. */
  layout: {
    done: 'Xong', reset: 'Đặt lại', grid: 'Lưới', size: 'Cỡ', opacity: 'Độ mờ',
    slot: (n: number) => `Bố cục ${n}`,
  },
  /** Armor tiers (GDD §7) and modules; ids come from shared/src/data. */
  armorTier: { tap_de: 'Tạp dề', da: 'Giáp da', da_dinh: 'Giáp da đinh', giap_nua: 'Giáp nửa', giap_toan_than: 'Giáp toàn thân' },
  module: {
    phan_luc: 'Bộ phản lực', sung_may_vai: 'Súng máy vai', no_vai: 'Nỏ vai',
    banh_lan: 'Bánh lăn gót', khien_tay: 'Khiên tay', binh_no: 'Bình nổ',
  },
} as const;
