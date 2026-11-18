/** The ONLY place for player-facing Vietnamese text. Each phase adds its own keys. */
export const STR = {
  gate: { rotate: 'Xoay ngang điện thoại' },
  /** Graphics settings (LOOK §1); the ledger UI arrives in phase 14. */
  gfx: {
    resolution: 'Độ phân giải điểm ảnh', native: 'Gốc',
    quantize: 'Nén màu', quantOff: 'Tắt', quantLight: 'Nhẹ', quantStrong: 'Mạnh',
    snap: 'Rung đỉnh',
  },
} as const;
