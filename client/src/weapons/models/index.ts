import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import * as bua_chien from './bua_chien';
import * as bua_de from './bua_de';
import * as bua_ren from './bua_ren';
import * as bua_ta from './bua_ta';
import * as chuy_gai from './chuy_gai';
import * as dai_dao from './dai_dao';
import * as giao_sat from './giao_sat';
import * as kich from './kich';
import * as kiem_ban_rong from './kiem_ban_rong';
import * as kiem_thep from './kiem_thep';
import * as kiem_tho from './kiem_tho';
import * as kiem_toi_lua from './kiem_toi_lua';
import * as phoi from './phoi';
import * as thuong_thep from './thuong_thep';
import * as tram_ma_dao from './tram_ma_dao';
import * as truong_kiem from './truong_kiem';

/** Procedural weapon builders by model id (WeaponDef.model). New model = new file + one line here. */
export const WEAPON_MODELS: Record<string, { build(ctx: ModelCtx): THREE.Group }> = {
  phoi, kiem_tho, kiem_thep, kiem_ban_rong, truong_kiem, kiem_toi_lua,
  bua_ren, bua_ta, chuy_gai, bua_chien, bua_de,
  giao_sat, thuong_thep, kich, dai_dao, tram_ma_dao,
};
