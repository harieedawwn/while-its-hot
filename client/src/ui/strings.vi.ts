/** The ONLY place for player-facing Vietnamese text. Each phase adds its own keys. */
export const STR = {
  gate: { rotate: 'Xoay ngang điện thoại' },
  /** Title + main menu (LOOK §8, §10). Display words are uppercased by CSS; keep sentence case here. */
  title: { name: "While It's Hot", start: 'Chạm để bắt đầu' },
  menu: {
    online: 'Chơi mạng', training: 'Luyện tập', armory: 'Kho vũ khí', settings: 'Cài đặt', quit: 'Thoát',
    createRoom: 'Tạo phòng', joinRoom: 'Vào phòng', back: 'Quay lại',
    /** Toast for a door that is not built yet (server arrives in phase 16, armory in 14). */
    closed: 'Chưa mở',
  },
  /** Settings ledger (phase 13 has the first rows; phase 14 fills it). */
  settings: {
    tabs: { gfx: 'Hình ảnh', audio: 'Âm thanh', controls: 'Điều khiển', view: 'Góc nhìn', profile: 'Hồ sơ' },
    reduceMotion: 'Giảm chuyển động', on: 'Bật', off: 'Tắt',
  },
  /** Graphics settings (LOOK §1); the ledger UI arrives in phase 14. */
  gfx: {
    resolution: 'Độ phân giải điểm ảnh', native: 'Gốc',
    quantize: 'Nén màu', quantOff: 'Tắt', quantLight: 'Nhẹ', quantStrong: 'Mạnh',
    snap: 'Rung đỉnh',
    /** VFX setting (phase 10): hit puffs and floor marks; off = sparks only. */
    blood: 'Máu',
  },
  /** Audio settings (AUDIO §1.5); the ledger UI arrives in phase 14. */
  audio: { master: 'Âm lượng', sfx: 'Hiệu ứng', world: 'Môi trường', ui: 'Giao diện', output: 'Đầu ra', phone: 'Loa điện thoại', headphones: 'Tai nghe', haptics: 'Rung phản hồi' },
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
  /** Weapon families and forms (GDD §5–6); ids come from shared/src/data/weapons.ts. */
  family: { kiem: 'Kiếm', bua: 'Búa', thuong: 'Thương' },
  weapon: {
    phoi: 'Phôi thép',
    kiem_tho: 'Kiếm thô', kiem_thep: 'Kiếm thép', kiem_ban_rong: 'Kiếm bản rộng', truong_kiem: 'Trường kiếm', kiem_toi_lua: 'Kiếm tôi lửa',
    bua_ren: 'Búa rèn', bua_ta: 'Búa tạ', chuy_gai: 'Chùy gai', bua_chien: 'Búa chiến', bua_de: 'Búa đe',
    giao_sat: 'Giáo sắt', thuong_thep: 'Thương thép', kich: 'Kích', dai_dao: 'Đại đao', tram_ma_dao: 'Trảm mã đao',
  },
  /** Forge stance HUD (GDD §6). Only result words and what a player truly needs to read. */
  forge: {
    outcome: { tuyet: 'Tuyệt', dat: 'Đạt', giu: 'Giữ', hong: 'Hỏng' },
    broke: 'Gãy', refused: 'Chạm trần',
    target: { blade: 'Vũ khí', armor: 'Giáp' },
    frenzy: 'Nhập thần',
  },
} as const;
