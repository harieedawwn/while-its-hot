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
  /** Online lobby (phase 16). */
  lobby: {
    title: 'Chơi mạng', create: 'Tạo phòng', join: 'Vào phòng', code: 'Mã phòng', codeHint: 'ABCD', enter: 'Vào',
    room: 'Phòng', ready: 'Sẵn sàng', notReady: 'Hủy sẵn sàng', start: 'Bắt đầu', host: 'Chủ phòng', leave: 'Rời phòng',
    truce: 'Hưu chiến', seconds: (n: number) => (n === 0 ? 'Không' : `${n} giây`), ping: (ms: number) => `${ms} ms`,
    waiting: 'Đang chờ người chơi', offline: 'Mất kết nối',
    err: { full: 'Phòng đã đầy', started: 'Trận đã bắt đầu', closed: 'Phòng đã đóng', bad: 'Chưa thể bắt đầu', notfound: 'Không có phòng này', host: 'Chỉ chủ phòng', net: 'Không kết nối được' },
    retry: 'Đang nối lại', count: (n: number, max: number) => `${n}/${max}`,
    set: {
      rounds: 'Thắng để vô địch', roundS: 'Thời gian vòng', lives: 'Số mạng', truce: 'Hưu chiến', ring: 'Vòng lửa', maxPlayers: 'Số người tối đa',
      ringNames: ['Chậm', 'Vừa', 'Nhanh'], rounds_n: (n: number) => `${n} vòng`, time: (s: number) => `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`,
    },
  },
  /** Settings ledger (phase 13 has the first rows; phase 14 fills it). */
  settings: {
    tabs: { gfx: 'Hình ảnh', audio: 'Âm thanh', controls: 'Điều khiển', view: 'Góc nhìn', profile: 'Hồ sơ' },
    reduceMotion: 'Giảm chuyển động', on: 'Bật', off: 'Tắt',
    fixed: 'Cố định', floating: 'Nổi',
    tapParry: 'Chạm để đỡ', holdParry: 'Giữ để đỡ',
  },
  /** Controls tab rows (TECH §5). */
  controls: {
    layout: 'Chỉnh bố cục', open: 'Mở', stick: 'Cần điều khiển', stickSize: 'Cỡ cần', deadzone: 'Vùng chết',
    sensX: 'Độ nhạy ngang', sensY: 'Độ nhạy dọc', invertY: 'Đảo trục dọc', gyro: 'Con quay hồi chuyển',
    gyroSens: 'Độ nhạy quay', aimAssist: 'Hỗ trợ ngắm', parry: 'Đỡ đòn',
  },
  /** View tab rows. */
  view: { fov: 'Góc nhìn ngang', bob: 'Lắc đầu khi chạy', shake: 'Rung màn hình' },
  /** Profile tab rows. */
  profile: {
    name: 'Tên', color: 'Màu', clear: 'Xóa dữ liệu', clearDo: 'Xóa', clearSure: 'Chạm lần nữa để xóa',
    cleared: 'Đã xóa', defaultName: 'Thợ rèn', colorName: (i: number) => `Màu ${i + 1}`,
  },
  /** Graphics settings (LOOK §1); the ledger UI arrives in phase 14. */
  gfx: {
    resolution: 'Độ phân giải điểm ảnh', native: 'Gốc',
    quantize: 'Nén màu', quantOff: 'Tắt', quantLight: 'Nhẹ', quantStrong: 'Mạnh',
    snap: 'Rung đỉnh', fpsCap: 'Giới hạn FPS', showFps: 'Hiện FPS', uncapped: 'Tối đa',
    /** VFX setting (phase 10): hit puffs and floor marks; off = sparks only. */
    blood: 'Máu',
  },
  /** Audio settings (AUDIO §1.5); the ledger UI arrives in phase 14. */
  audio: { master: 'Âm lượng', sfx: 'Hiệu ứng', world: 'Môi trường', ui: 'Giao diện', output: 'Đầu ra', phone: 'Loa điện thoại', headphones: 'Tai nghe', haptics: 'Rung phản hồi' },
  /** Armory (LOOK §8): rails by family; one line for what a form's passive does. */
  armory: {
    level: (n: number) => `+${n}`, locked: 'Khóa', base: 'Phôi',
    passive: {
      combo3_bonus: 'Đòn thứ ba trong chuỗi nặng hơn',
      parry_window_plus: 'Khung đỡ đòn rộng hơn',
      thrust_pierce: 'Mũi đâm xuyên giáp',
      burn_on_hit: 'Đòn trúng gây bỏng',
      light_break_block: 'Đòn nhẹ phá thế đỡ',
      stagger_plus: 'Làm choáng lâu hơn',
      slam_aoe: 'Đập đất gây sát thương vòng',
      heavy_launch: 'Đòn nặng hất tung đối thủ',
      max_reach_bonus: 'Tầm đâm xa hơn',
      sweep_wide: 'Quét rộng hơn',
      slide_lunge_plus: 'Trượt rồi đâm xa hơn',
      heavy_pull: 'Đòn nặng kéo đối thủ lại',
      none: 'Không có nội tại',
    } as Record<string, string>,
  },
  /** In-game HUD, pause and scoreboard (LOOK §8): labels only where a player truly needs one. */
  /** Training yard boards (GDD §10): painted words on the world's own signs. */
  yard: {
    modes: { idle: 'Đứng yên', block: 'Đỡ đòn', counter: 'Phản đòn', move: 'Di chuyển' },
    lastHit: 'Đòn cuối', dps: 'DPS', armor: 'Giáp', rack: 'Vũ khí', dummies: 'Người gỗ',
  },
  hud: { fps: 'FPS', lives: 'Mạng', ring: 'Vòng lửa', kills: 'Hạ', deaths: 'Gục', level: 'Cấp', you: 'Bạn' },
  pause: { title: 'Tạm dừng', resume: 'Tiếp tục', settings: 'Cài đặt', leave: 'Thoát' },
  score: { title: 'Bảng điểm', player: 'Người chơi', weapon: 'Vũ khí' },
  /** Touch layout editor (Điều khiển → Chỉnh bố cục). Game buttons carry pictograms only, never text. */
  layout: {
    done: 'Xong', reset: 'Đặt lại hết', resetOne: 'Đặt lại nút', grid: 'Lưới', size: 'Cỡ', opacity: 'Độ mờ', mirror: 'Đảo tay',
    slot: (n: number) => `Bố cục ${n}`, slots: 'Bố cục', presets: 'Mẫu',
    preset: { two: '2 ngón', three: '3 ngón', four: '4 ngón' } as Record<'two' | 'three' | 'four', string>,
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
  /** Round flow (GDD §3, §8): cage draft, round result, match end. */
  match: {
    draft: 'Chọn di vật', reroll: 'Đổi', round: (n: number) => `Vòng ${n}`, fight: 'Đấu!', truce: 'Hưu chiến',
    won: (name: string) => `${name} thắng vòng`, draw: 'Hòa vòng', wins: 'Vòng', points: 'Điểm', back: 'Về sảnh',
    champion: (name: string) => `${name} vô địch`, unlocked: 'Mở khóa', none: 'Không có gì mới', eliminated: 'Hết mạng',
    stacks: 'Tiếng tăm', moduleTag: 'Mô-đun giáp', dead: 'Bạn đã chết', armor: 'Giáp',
  },
  /** Relics (GDD §8): name + the one line that says what it does. */
  relic: {
    da_niem: { name: 'Đá niêm', line: 'Lần Vỡ đầu tiên mỗi vòng thành Giữ' },
    hon_than_do: { name: 'Hòn than đỏ', line: 'Một lần Lên +2 mỗi vòng' },
    vong_da: { name: 'Vòng da', line: 'Mỗi nhát búa tốn ít nhiệt hơn 25%' },
    moi_han: { name: 'Mối hàn', line: 'Sau khi Vỡ, nhát Trúng kế tiếp chắc chắn Lên' },
    an_sat: { name: 'Ấn sắt', line: 'Vũ khí mạnh hơn 10%' },
    kim_giu_nhiet: { name: 'Kìm giữ nhiệt', line: 'Nhiệt nguội chậm một nửa' },
    ong_be: { name: 'Ống bễ', line: 'Nung nóng nhanh gấp đôi' },
    bua_nen: { name: 'Búa nện', line: 'Mỗi lần Vỡ hất văng người quanh đe' },
    de_nhe: { name: 'Đe nhẹ', line: 'Đặt và nhấc đe tức thì' },
    dau_toi: { name: 'Dầu tôi', line: 'Đỡ đòn hồi 1 thể lực và 5 máu' },
    gang_da: { name: 'Găng da', line: 'Rời bàn rèn được miễn đòn 0,3 giây' },
    mat_tho: { name: 'Mắt thợ', line: 'Vùng ngọt rộng hơn 40%' },
    sat_vun: { name: 'Sắt vụn', line: 'Hạ người: vũ khí +1 cấp' },
    dinh_tan: { name: 'Đinh tán', line: 'Mỗi vòng bắt đầu với giáp +2' },
  },
  /** Forge stance HUD (GDD §6). Only result words and what a player truly needs to read. */
  forge: {
    outcome: { len: 'Lên', giu: 'Giữ', vo: 'Vỡ' },
    hit: 'Trúng', miss: 'Trượt', refused: 'Chạm trần',
    target: { blade: 'Vũ khí', armor: 'Giáp' },
    frenzy: 'Nhập thần',
  },
} as const;
