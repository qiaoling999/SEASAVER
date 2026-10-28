document.body.dataset.mode = "student";
// ===== 關卡資料（所有座標都集中在這裡；座標 [x, y]，x=1..8 對應 A..H，y=1..8） =====
/** 海廢種類：顯示名稱、要卸到哪一區、圖示 */
const WASTE_TYPES = {
  bottle: {
    label: "寶特瓶",
    zone: "A",
    icon: "i-bottle",
    image: "assets/waste/bottle.png"
  },

  bag: {
    label: "食品包裝袋",
    zone: "B",
    icon: "i-bag",
    image: "assets/waste/snack_bag.png"
  },

  cup: {
    label: "紙飲料杯",
    zone: "A",
    icon: "i-cup",
    image: "assets/waste/cup.png"
  },

  plastic: {
    label: "塑膠袋",
    icon: "i-plastic",
    hint: "請注意乾淨程度",
    variants: {
      clean: {
        label: "乾淨塑膠袋",
        zone: "A",
        icon: "i-plastic",
        image: "assets/waste/plastic_clean.png"
      },

      dirty: {
        label: "髒污塑膠袋",
        zone: "B",
        icon: "i-plastic-dirty",
        image: "assets/waste/plastic_dirty.png"
      },
    }
  },

  foam: {
    label: "保麗龍",
    icon: "i-foam",
    hint: "請注意是否沾油",
    variants: {
      clean: {
        label: "乾淨保麗龍",
        zone: "A",
        icon: "i-foam",
        image: "assets/waste/foam_clean.png"
      },

      oily: {
        label: "沾油保麗龍",
        zone: "B",
        icon: "i-foam-oily",
        image: "assets/waste/foam_dirty.png"
      },
    }
  },
};

const ZONE_LABEL = {
  A: "回收區",
  B: "垃圾區"
};

/** 取得某個海廢（種類＋狀態）的名稱、處理區、圖示 */
function wasteInfo(kind, variant) {
  const t = WASTE_TYPES[kind];

  const v =
    variant && t.variants
      ? t.variants[variant]
      : null;

  const key =
    variant
      ? `${kind}:${variant}`
      : kind;

  return {
    key,
    kind,
    variant: variant || null,

    label: v ? v.label : t.label,
    icon: v ? v.icon : t.icon,
    image: v ? v.image : t.image,

    zone:
      (LEVEL.variantZones && LEVEL.variantZones[key]) ||
      (v && v.zone) ||
      t.zone
  };
}

const wasteInfoOf = w => wasteInfo(w[2], w[3]);



let LEVEL = LEVELS["1-1"];

// ===== SEA SAVER 關卡進度：學生循序解鎖；重新整理後重新從 1-1 開始 =====
const LEVEL_ORDER = ["1-1","1-2","1-3","1-4","1-5","2-1","2-2","2-3","2-4","2-5","3-1","3-2","3-3","3-4","3-5"];
const unlockedLevelIds = new Set(["1-1"]);
const completedLevelIds = new Set();
function isLevelUnlocked(id) { return isTeacherMode() || unlockedLevelIds.has(id); }
function highestUnlockedLevel() {
  let id = "1-1";
  for (const x of LEVEL_ORDER) if (unlockedLevelIds.has(x)) id = x;
  return id;
}
function refreshLevelOptions() {
  const sel = document.getElementById("level-select");
  [...sel.options].forEach(opt => {
    const base = opt.dataset.baseLabel || opt.textContent.replace(/^🔒\s*/, "");
    opt.dataset.baseLabel = base;
    const locked = !isTeacherMode() && !unlockedLevelIds.has(opt.value);
    opt.disabled = locked;
    opt.textContent = locked ? `🔒 ${base}` : base;
  });
  sel.value = LEVEL.id;
  renderLevelMap();
}
function unlockNextLevel(id) {
  if (isTeacherMode()) return null;
  const i = LEVEL_ORDER.indexOf(id);
  if (i < 0 || i >= LEVEL_ORDER.length - 1) return null;
  const next = LEVEL_ORDER[i + 1];
  if (unlockedLevelIds.has(next)) return null;
  unlockedLevelIds.add(next);
  refreshLevelOptions();
  return next;
}
const MAP_SIZE = 8;
const COLS = "ABCDEFGH";
const has = (list, x, y) => list.some(([a,b]) => a === x && b === y);
const cellName = (x, y) => (COLS[x-1] || "?") + y;

// ===== direction：方向 =====
// 地圖座標：x 往右增加（A→H），y 往下增加（1→8）。順時針順序：上→右→下→左。
const DIR_ORDER = ["up", "right", "down", "left"];
const DIR_VEC = { up: {dx:0,dy:-1}, right: {dx:1,dy:0}, down: {dx:0,dy:1}, left: {dx:-1,dy:0} };
const DIR_LABEL = { up: "朝上", right: "朝右", down: "朝下", left: "朝左" };
const DIR_ROT = { down: 0, left: 90, up: 180, right: 270 }; // 船圖示預設船頭朝下

/** 以船自己的角度右轉（順時針 90°） */
function turnRightDir(dir) { return DIR_ORDER[(DIR_ORDER.indexOf(dir) + 1) % 4]; }
/** 以船自己的角度左轉（逆時針 90°） */
function turnLeftDir(dir)  { return DIR_ORDER[(DIR_ORDER.indexOf(dir) + 3) % 4]; }

// ===== collision：碰撞檢查 =====
function isInsideMap(x, y) { return x >= 1 && x <= MAP_SIZE && y >= 1 && y <= MAP_SIZE; }
function isReef(x, y) { return has(LEVEL.reefs, x, y); }
/** 海廢（尚未拾取的寶特瓶）：不能開進去，但不是危險區，不算重大錯誤 */
function isWaste(x, y) { return has(state.bottles, x, y); }
/** 回傳 null（可通行）或錯誤代碼 "OUT_OF_MAP" / "REEF" */
function checkCollision(x, y) {
  if (!isInsideMap(x, y)) return "OUT_OF_MAP";
  if (isReef(x, y)) return "REEF";
  return null;
}

// ===== movement：移動 =====
/** 依目前方向算出目標格。steps = +1 前進、-1 後退 */
function getMoveTarget(ship, steps) {
  const v = DIR_VEC[ship.dir];
  return { x: ship.x + v.dx * steps, y: ship.y + v.dy * steps };
}
/** 嘗試移動；撞到時船留在原位並回傳重大錯誤 */
function moveShip(ship, steps) {
  const t = getMoveTarget(ship, steps);
  const hit = checkCollision(t.x, t.y);
  if (hit) return { ok: false, fatal: true, error: hit, target: t, ship };          // 地圖外／礁石 → 重大錯誤
  if (isWaste(t.x, t.y)) return { ok: false, fatal: false, blocked: "WASTE", target: t, ship };   // 海廢 → 條件不成立
  return { ok: true, ship: { ...ship, x: t.x, y: t.y } };
}
/** 原地轉向：只改方向、不改座標，旁邊有礁石也合法 */
function turnShip(ship, side) {
  const dir = side === "left" ? turnLeftDir(ship.dir) : turnRightDir(ship.dir);
  return { ok: true, ship: { ...ship, dir } };
}

// ===== 單一動作入口（之後 RUN 逐張呼叫這裡） =====
const ACTIONS = {
  forward:   s => moveShip(s, +1),
  backward:  s => moveShip(s, -1),
  turnLeft:  s => turnShip(s, "left"),
  turnRight: s => turnShip(s, "right"),
};
const ACTION_LABEL = { forward: "前進", backward: "後退", turnLeft: "左轉", turnRight: "右轉", loop: "迴圈 ×2" };
function executeAction(ship, action) { return ACTIONS[action](ship); }

// ===== 遊戲狀態 =====
/** 本關初始狀態：船回起點、海廢復原、貨艙清空、任務進度歸零 */
function createInitialState() {
  return {
    ship: { ...LEVEL.ship },
    bottles: LEVEL.wastes.map((b, i) => { const a = b.slice(); a.id = i; return a; }),   // 地圖上尚未拾取的海廢 [x, y, 種類, 狀態]；id 用來追蹤（聚集＝同一格有多筆）
    cargo: [],
    delivered: 0,
    deliveredByZone: { A: 0, B: 0 },
    deliveredByKind: {},      // 依種類統計已正確卸載的數量（Level 2-1 的完成條件用）
    loopsUsed: 0,             // 成功完整執行的迴圈次數
    untangles: 0,              // 成功解纏次數（Level 2-2 起）
    completed: false,         // 正式任務結果：一旦完成就不再改變
    completedAtRun: null,
    completedWithFatal: false,
    freePlay: false,          // 結算後選「繼續自由操作」
    turns: 0,                 // 回合數：每次 RUN、每次確認換牌各 +1
    swapCount: 0,             // 換牌次數：每次確認換牌 +1（不管換幾張）
    execCount: 0,             // 執行指令數：RUN 中真正被執行（含條件不成立）的指令；迴圈本身不算
    completedStats: null,     // 第一次完成任務當下的統計（之後自由操作不會改寫）
  };
}
const state = createInitialState();   // 正式遊戲狀態（學生／教師模式共用）
/** 開發工具的沙盒：只存測試船，不碰正式 state、牌堆或紀錄 */
const debug = { ship: null, stopped: false };
/** 教師模式只影響「顯示」，不參與任何遊戲規則判斷 */
const isTeacherMode = () => document.body.dataset.mode === "teacher";
/** 正式紀錄：之後 Prediction 與最近 3 次 RUN 歷史寫在這裡；開發工具不會碰 */
const records = { predictions: [], runHistory: [], runCount: 0 };
const HISTORY_LIMIT = 3;
const DIR_ARROW = { up: "↑", right: "→", down: "↓", left: "←" };
/** 描述某一格目前的內容（給拾取／卸載紀錄用） */
function describeCell(x, y) {
  if (!isInsideMap(x, y)) return "地圖外";
  const w = state.bottles.find(([a, b]) => a === x && b === y);
  if (w) return w.entangled ? `${wasteInfoOf(w).label}（纏住）` : wasteInfoOf(w).label;
  if (isReef(x, y)) return "礁石";
  const z = getZoneAt(x, y);
  if (z) return ZONE_LABEL[z];
  return "空的海面";
}
let highlightCell = null;   // RUN 執行拾取／卸載時，標出船右側那一格

// ===== 常駐指令：拾取／卸載（不是手牌，不進棄牌堆） =====
const cargoCapacity = () => LEVEL.cargoCapacity || 2;
const CMD_LABEL = { pickup: "拾取", unload: "卸載", untangle: "解纏" };
const CMD_ICON = { pickup: "i-pick", unload: "i-drop", untangle: "i-untangle" };
const levelWasteInfos = () => { const m = new Map(); LEVEL.wastes.forEach(w => { const i = wasteInfoOf(w); if (!m.has(i.key)) m.set(i.key, i); }); return [...m.values()]; };
const wasteLabelsForZone = zone => levelWasteInfos().filter(i => i.zone === zone).map(i => i.label);

/** 船右側相鄰一格：朝北→東、朝東→南、朝南→西、朝西→北（可能在地圖外） */
function getRightSideCell(ship) {
  const v = DIR_VEC[turnRightDir(ship.dir)];
  return { x: ship.x + v.dx, y: ship.y + v.dy };
}
function getZoneAt(x, y) {
  if (x === LEVEL.zoneA[0] && y === LEVEL.zoneA[1]) return "A";
  if (x === LEVEL.zoneB[0] && y === LEVEL.zoneB[1]) return "B";
  return null;
}
/** 拾取：右側有寶特瓶且貨艙未滿才成功；否則只回報原因（不是重大錯誤） */
function doPickup(st) {
  const c = getRightSideCell(st.ship), where = cellName(c.x, c.y);
  // 同一格的海廢一次全部撿起（Level 1 每格最多 1 個，行為不變；Level 2 的聚集不做部分拾取）
  const here = st.bottles.filter(([x, y]) => x === c.x && y === c.y);
  if (!isInsideMap(c.x, c.y) || !here.length) return { ok: false, cell: c, msg: `右側${isInsideMap(c.x, c.y) ? `（${where}）` : "是地圖外，"}沒有${LEVEL.wasteWord}。` };
  if (here.some(w => w.entangled)) return { ok: false, cell: c, msg: "塑膠袋還纏在礁石上，請先使用「解纏」。" };
  if (st.cargo.length + here.length > cargoCapacity()) {
    if (here.length > 1) {
      const free = cargoCapacity() - st.cargo.length;
      return { ok: false, cell: c, msg: `📦 貨艙空間不足<br>這裡有 ${here.length} 個海廢，需要 ${here.length} 格空間。<br>目前貨艙只剩 ${free} 格，請先卸載貨物或調整路線。` };
    }
    return { ok: false, cell: c, msg: `貨艙已滿（${cargoCapacity()}/${cargoCapacity()}），撿不下了。` };
  }
  const labels = [];
  here.forEach(w => {
    const info = wasteInfoOf(w);
    st.bottles.splice(st.bottles.indexOf(w), 1);
    st.cargo.push({ kind: info.kind, variant: info.variant, key: info.key, zone: info.zone, label: info.label, icon: info.icon });
    labels.push(info.label);
  });
  return { ok: true, cell: c, cluster: here.length > 1, msg: `撿起 ${where} 的${labels.join("、")}（貨艙 ${st.cargo.length}/${cargoCapacity()}）。` };
}
/** 卸載：右側是正確卸載區時，一次卸掉貨艙中所有屬於該區的物品 */
function doUnload(st) {
  const c = getRightSideCell(st.ship);
  const zone = getZoneAt(c.x, c.y);

  if (!zone) {
    return { ok: false, cell: c, msg: "右側不是卸載區。" };
  }

  if (wasteLabelsForZone(zone).length === 0) {
    const other = zone === "A" ? "B" : "A";
    return {
      ok: false,
      cell: c,
      msg: `這裡是${ZONE_LABEL[zone]}，${wasteLabelsForZone(other).join("、")}要送到${ZONE_LABEL[other]}。`
    };
  }

  const fits = st.cargo.filter(it => it.zone === zone);

  if (fits.length === 0) {
    if (st.cargo.length) {
      const lbl = it => it.label || WASTE_TYPES[it.kind].label;
      const wrong = [...new Set(
        st.cargo.map(it => `${lbl(it)}要送到${ZONE_LABEL[it.zone]}`)
      )].join("、");

      return {
        ok: false,
        cell: c,
        msg: `這裡是${ZONE_LABEL[zone]}，貨艙裡的${wrong}。`
      };
    }

    return {
      ok: false,
      cell: c,
      msg: "貨艙目前是空的，沒有東西可以卸載。"
    };
  }

  st.cargo = st.cargo.filter(it => it.zone !== zone);
  st.delivered += fits.length;

  if (st.deliveredByZone) st.deliveredByZone[zone] += fits.length;

  if (st.deliveredByKind) {
    fits.forEach(it => {
      st.deliveredByKind[it.kind] =
        (st.deliveredByKind[it.kind] || 0) + 1;
    });
  }

  const lbl = it => it.label || WASTE_TYPES[it.kind].label;
  const what = [...new Set(fits.map(lbl))]
    .map(l => `${fits.filter(f => lbl(f) === l).length} 個${l}`)
    .join("、");

  const progress =
    LEVEL.goal && st.deliveredByZone
      ? `${ZONE_LABEL.A} ${st.deliveredByZone.A}/${LEVEL.goal.A}、${ZONE_LABEL.B} ${st.deliveredByZone.B}/${LEVEL.goal.B}`
      : `已送達 ${st.delivered}/${LEVEL.goalTotal || LEVEL.wastes.length}`
        + (
          LEVEL.goalKinds && st.deliveredByKind
            ? `；${Object.keys(LEVEL.goalKinds)
                .map(k => `${WASTE_TYPES[k].label} ${st.deliveredByKind[k] || 0}`)
                .join("、")}`
            : ""
        );

  return {
    ok: true,
    cell: c,
    zone,
    msg: `卸下 ${what}到${ZONE_LABEL[zone]}（${progress}）。`
  };
}
function doUntangle(st) {
  const c = getRightSideCell(st.ship), where = cellName(c.x, c.y);
  if (!LEVEL.untangleTool) return { ok:false, cell:c, msg:"本關沒有解纏工具。" };
  const target = st.bottles.find(w => w[0] === c.x && w[1] === c.y && w.entangled && w[2] === "plastic");
  if (!isInsideMap(c.x, c.y) || !target) return { ok:false, cell:c, msg:`右側${isInsideMap(c.x,c.y) ? `（${where}）` : "是地圖外，"}沒有需要解纏的海廢。` };
  target.entangled = false;
  st.untangles = (st.untangles || 0) + 1;
  return { ok:true, cell:c, msg:`解開 ${where} 纏在礁石上的塑膠袋。它會先留在原格，回合結束時才再次受到洋流影響。` };
}
const COMMANDS = { pickup: doPickup, unload: doUnload, untangle: doUntangle };
/** 完成條件：有 goal 的關卡看各區數量（1-3）；沒有的關卡要全部送達（1-1、1-2） */
/** 卸載數量是否達標（1-3、1-5 看各區；1-4 看總數；1-1、1-2 要全部） */
function deliveriesDone() {
  if (LEVEL.goal) return Object.entries(LEVEL.goal).every(([z, n]) => state.deliveredByZone[z] >= n);
  if (LEVEL.goalKinds && !Object.entries(LEVEL.goalKinds).every(([k, n]) => (state.deliveredByKind[k] || 0) >= n)) return false;   // 2-1：至少 1 寶特瓶＋1 紙杯
  return state.delivered >= (LEVEL.goalTotal || LEVEL.wastes.length);
}
function isLevelGoalMet() {
  if (LEVEL.requireLoop && !state.loopsUsed) return false;
  if (LEVEL.requireUntangle && !state.untangles) return false;
  if (LEVEL.requirePredictionMatch && !records.predictions.some(p => p.match === true)) return false;
  if (LEVEL.requireFogPredictionMatch && !records.predictions.some(p => p.match === true && p.fog)) return false;
  return deliveriesDone();
}

// ===== 洋流（只有設定 LEVEL.current 的關卡才會用到） =====
const wrapCoord = v => ((v - 1 + MAP_SIZE) % MAP_SIZE + MAP_SIZE) % MAP_SIZE + 1;
/** Level 3 環境預報：固定序列，不使用隨機，讓學生可以預測。 */
function environmentForTurn(turnNo) {
  const seq = LEVEL.weatherSeq;
  if (Array.isArray(seq) && seq.length) return seq[(Math.max(1, turnNo) - 1) % seq.length];
  return { wind: LEVEL.wind || null, fog: false };
}
function displayEnvironment() {
  return environmentForTurn(state.turns + (running ? 0 : 1));
}
function hasWind() {
  const e = environmentForTurn(Math.max(1, state.turns + (running ? 0 : 1)));
  return !!e.wind;
}
function environmentLabel(env = displayEnvironment()) {
  const parts = [`🌊 ${LEVEL.current ? LEVEL.current.label : "無洋流"}`];
  if (env.wind) parts.push(`💨 ${env.wind.label}`);
  if (env.fog) parts.push("🌫️ 有霧");
  else if (LEVEL.weatherSeq) parts.push("☀️ 視野清楚");
  return parts.join("　");
}
function renderEnvironmentBanner() {
  const el = document.getElementById("current-text");
  if (!el || !LEVEL.current) return;
  el.textContent = (LEVEL.wind || LEVEL.weatherSeq) ? `下一回合｜${environmentLabel()}` : `🌊 洋流方向：${LEVEL.current.label}`;
}
function fogHiddenIds() {
  const env = displayEnvironment();
  if (!env.fog) return new Set();
  const count = LEVEL.fogHideCount || 2;
  const ids = state.bottles.filter(w => !w.entangled).map(w => w.id).sort((a,b)=>a-b);
  return new Set(ids.filter((_,i)=>i%2===0).slice(0,count));
}
const TURN_END_HOLD = 1200;   // Level 2：「本回合結束」至少停留的時間（毫秒）
const BLOCK_TEXT = { reef: "被礁石擋住了", ship: "被船擋住了", zone: "前方是處理區", full: "前方聚集已滿" };
/**
 * 同步計算一次洋流：先把同一格的海廢視為一組（聚集一起漂），算出每組的目標格，
 * 再一起判斷阻擋／聚集，最後才得到所有海廢的新位置（不是一個移完再換下一個）。
 * 回傳 { moves, blocks, clusters, pos }，pos：id → [x, y]
 */
function computeCurrent(bottles, ship, dirOverride = null) {
  const v = DIR_VEC[dirOverride || LEVEL.current.dir], limit = LEVEL.stackLimit || 2;
  const byId = new Map(bottles.map(w => [w.id, w]));
  const groups = new Map();
  bottles.forEach(w => {
    const k = `${w[0]},${w[1]}`;
    if (!groups.has(k)) groups.set(k, { x:w[0], y:w[1], ids:[] });
    groups.get(k).ids.push(w.id);
  });
  const G = [...groups.values()];
  const entangles = [], splits = [];
  G.forEach(g => {
    if (g.ids.some(id => byId.get(id)?.entangled)) { g.tx=g.x; g.ty=g.y; g.reason="entangled"; g.moving=false; return; }
    const rx=g.x+v.dx, ry=g.y+v.dy;
    g.tx=wrapCoord(rx); g.ty=wrapCoord(ry); g.wrapped=g.tx!==rx || g.ty!==ry;
    const targetReef=isReef(g.tx,g.ty);
    const plasticIds=g.ids.filter(id => byId.get(id)?.[2] === "plastic");
    const otherIds=g.ids.filter(id => byId.get(id)?.[2] !== "plastic");
    if (targetReef && LEVEL.allowEntangle && plasticIds.length) {
      if (g.ids.length === 1) {
        g.special="entangle"; g.moving=true; g.reason=null; entangles.push({ids:plasticIds,from:[g.x,g.y],to:[g.tx,g.ty]}); return;
      }
      if (LEVEL.allowSplitEntangle && otherIds.length) {
        g.special="split"; g.moving=false; g.reason="split";
        entangles.push({ids:plasticIds,from:[g.x,g.y],to:[g.tx,g.ty]});
        splits.push({plasticIds,otherIds,from:[g.x,g.y],to:[g.tx,g.ty]}); return;
      }
    }
    g.reason = targetReef ? "reef" : (ship.x===g.tx && ship.y===g.ty) ? "ship" : getZoneAt(g.tx,g.ty) ? "zone" : null;
    g.moving=!g.reason;
  });
  for (let changed=true,guard=0; changed && guard<100; guard++) {
    changed=false;
    const into=new Map();
    G.filter(g=>g.moving && g.special!=="entangle").forEach(g=>{const k=`${g.tx},${g.ty}`; into.set(k,(into.get(k)||[]).concat(g));});
    into.forEach((arrivals,k)=>{
      const stay=G.filter(g=>!g.moving && g.reason!=="split" && `${g.x},${g.y}`===k).reduce((n,g)=>n+g.ids.length,0)
        + splits.filter(sp=>`${sp.from[0]},${sp.from[1]}`===k).reduce((n,sp)=>n+sp.otherIds.length,0);
      const come=arrivals.reduce((n,g)=>n+g.ids.length,0);
      if(stay+come>limit){arrivals.forEach(g=>{g.moving=false;g.reason="full";});changed=true;}
    });
  }
  const pos={}, count=new Map(), arrivedCells=new Set();
  G.forEach(g=>{
    if(g.special==="split"){
      const sp=splits.find(q=>q.from[0]===g.x&&q.from[1]===g.y&&q.plasticIds.every(id=>g.ids.includes(id)));
      sp.plasticIds.forEach(id=>{pos[id]=sp.to;}); sp.otherIds.forEach(id=>{pos[id]=sp.from;});
      count.set(`${sp.to[0]},${sp.to[1]}`,(count.get(`${sp.to[0]},${sp.to[1]}`)||0)+sp.plasticIds.length);
      count.set(`${sp.from[0]},${sp.from[1]}`,(count.get(`${sp.from[0]},${sp.from[1]}`)||0)+sp.otherIds.length);
      arrivedCells.add(`${sp.to[0]},${sp.to[1]}`); return;
    }
    const [x,y]=g.moving?[g.tx,g.ty]:[g.x,g.y];
    g.ids.forEach(id=>{pos[id]=[x,y];}); count.set(`${x},${y}`,(count.get(`${x},${y}`)||0)+g.ids.length);
    if(g.moving) arrivedCells.add(`${x},${y}`);
  });
  const clusters=[...arrivedCells].filter(k=>{
    if(isReef(...k.split(',').map(Number))) return false;
    return count.get(k)>1;
  }).map(k=>k.split(',').map(Number));
  const moves=[];
  G.forEach(g=>{
    if(g.special==="split") return;
    if(g.moving) moves.push({ids:g.ids,from:[g.x,g.y],to:[g.tx,g.ty],wrapped:g.wrapped,special:g.special||null});
  });
  splits.forEach(sp=>moves.push({ids:sp.plasticIds,from:sp.from,to:sp.to,wrapped:false,special:"entangle"}));
  const blocks=G.filter(g=>!g.moving && !["split","entangled"].includes(g.reason)).map(g=>({ids:g.ids,from:[g.x,g.y],toward:[g.tx,g.ty],reason:g.reason}));
  return {moves,blocks,clusters,pos,entangles,splits};
}
/** 回合結束的洋流更新：同步計算 → 動畫 → 更新狀態。回傳一次性提示文字 */
async function applyCurrentUpdate() {
  const perfT0 = performance.now();
  const flow = computeCurrent(state.bottles, state.ship);
  const banner = document.getElementById("current-banner"), board = document.getElementById("board");
  banner.classList.add("updating");
  document.getElementById("current-text").textContent = "🌊 洋流更新";
  board.classList.add("flowing");
  await sleep(animDur(350));
  const cellRect = (x, y) => board.querySelector(`.cell[aria-label="${cellName(x, y)}"]`).getBoundingClientRect();
  const a = cellRect(1, 1), b = cellRect(2, 1), c2 = cellRect(1, 2);
  const cw = b.left - a.left, ch = c2.top - a.top, v = DIR_VEC[LEVEL.current.dir];
  const els = ids => ids.map(id => board.querySelector(`[data-wid="${id}"]`)).filter(Boolean);
  const anims = [];
  flow.moves.forEach(m => els(m.ids).forEach(el => {
    if (!m.wrapped) {
      const dx = (m.to[0] - m.from[0]) * cw, dy = (m.to[1] - m.from[1]) * ch;
      anims.push(el.animate([{ transform: el.style.transform || "none" }, { transform: `translate(${dx}px,${dy}px) ${el.style.transform || ""}` }],
        { duration: animDur(700), easing: "ease-in-out", fill: "forwards" }).finished);
    } else {   // 跨邊界：右側淡出
      anims.push(el.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${v.dx * cw * .55}px,${v.dy * ch * .55}px)`, opacity: 0 }],
        { duration: animDur(400), easing: "ease-in", fill: "forwards" }).finished);
    }
  }));
  flow.blocks.forEach(bk => els(bk.ids).forEach(el => {   // 被擋住：往前推一點 → 碰撞 → 彈回
    // 只往前推一小段（不進到前方格子裡，避免看起來像 3 個擠在同一格）
    anims.push(el.animate([{ transform: "translate(0,0)" }, { transform: `translate(${v.dx * cw * .14}px,${v.dy * ch * .14}px)`, offset: .45 },
      { transform: `translate(${v.dx * cw * .09}px,${v.dy * ch * .09}px)`, offset: .6 }, { transform: "translate(0,0)" }],
      { duration: animDur(450), easing: "ease-out" }).finished);
  }));
  await Promise.all(anims);
  // 同步套用新位置
  state.bottles.forEach(w => { const p = flow.pos[w.id]; if (p) { w[0] = p[0]; w[1] = p[1]; } });
  flow.entangles.forEach(e => e.ids.forEach(id => { const w = state.bottles.find(x => x.id === id); if (w) w.entangled = true; }));
  clearSimCache();   // 海廢位置變了
  renderBoard();
  const after = [];
  flow.moves.filter(m => m.wrapped).forEach(m => els(m.ids).forEach(el =>   // 左側重新出現
    after.push(el.animate([{ transform: `translate(${-v.dx * cw * .55}px,${-v.dy * ch * .55}px)`, opacity: 0 }, { transform: "translate(0,0)", opacity: 1 }],
      { duration: animDur(400), easing: "ease-out" }).finished)));
  flow.clusters.forEach(([x, y]) => board.querySelectorAll(`.cell[aria-label="${cellName(x, y)}"] .w2`).forEach((el, k) =>   // 聚集靠攏
    after.push(el.animate([{ transform: `translateX(${k ? 10 : -10}px)` }, { transform: "translateX(0)" }], { duration: animDur(350), easing: "ease-out" }).finished)));
  flow.blocks.forEach(bk => {   // 短暫顯示被擋住的原因
    const cell = board.querySelector(`.cell[aria-label="${cellName(...bk.from)}"]`);
    if (cell) { const t = document.createElement("span"); t.className = "flow-tip"; t.textContent = BLOCK_TEXT[bk.reason]; cell.appendChild(t); setTimeout(() => t.remove(), 1800); }
  });
  await Promise.all(after);
  board.classList.remove("flowing");
  banner.classList.remove("updating");
  document.getElementById("current-text").textContent = `🌊 洋流方向：${LEVEL.current.label}`;
  // 第一次遇到時才說明（各一次）
  const notes = [];
  if (!lv2.tips.reef && flow.blocks.some(bk => bk.reason === "reef")) { lv2.tips.reef = true; notes.push("🪨 海廢被礁石擋住時，會留在原本的格子，不會消失。"); }
  if (!lv2.tips.cluster && flow.clusters.length) { lv2.tips.cluster = true; notes.push(`🫧 兩個海廢漂進同一格，形成了「海廢聚集」。一格最多 ${LEVEL.stackLimit || 2} 個，之後會一起漂移；點聚集格可以看看裡面有什麼。`); }
  if (!lv2.tips.entangle && flow.entangles.length) { lv2.tips.entangle = true; notes.push("🪢 塑膠袋碰到礁石纏住了！它不會再漂移，要先用「解纏」才能拾取。"); }
  if (!lv2.tips.split && flow.splits.length) { lv2.tips.split = true; notes.push("🫧 聚集撞上礁石後拆開了：塑膠袋纏在礁石上，另一個海廢留在原格。"); }
  perfMark("applyCurrentUpdate（含動畫）", perfT0);
  return { flow, notes };
}


/** Level 3：洋流之後再執行風。強風採逐格移動，每一步都重新判斷阻擋／纏繞。 */
async function applyWindUpdate() {
  const env = environmentForTurn(Math.max(1, state.turns));
  if (!env.wind) return { notes: [], steps: [] };
  const notes = [], steps = [];
  const board = document.getElementById("board"), banner = document.getElementById("current-banner");
  for (let stepNo = 1; stepNo <= (env.wind.strength || 1); stepNo++) {
    const flow = computeCurrent(state.bottles, state.ship, env.wind.dir);
    banner.classList.add("updating");
    document.getElementById("current-text").textContent = `💨 風影響 ${stepNo}/${env.wind.strength || 1}`;
    board.classList.add("flowing");
    await sleep(animDur(250));
    const cellRect = (x, y) => board.querySelector(`.cell[aria-label="${cellName(x, y)}"]`).getBoundingClientRect();
    const a=cellRect(1,1), b=cellRect(2,1), c2=cellRect(1,2), cw=b.left-a.left, ch=c2.top-a.top;
    const v=DIR_VEC[env.wind.dir];
    const els=ids=>ids.map(id=>board.querySelector(`[data-wid="${id}"]`)).filter(Boolean);
    const anims=[];
    flow.moves.forEach(m=>els(m.ids).forEach(el=>{
      const dx=(m.to[0]-m.from[0])*cw, dy=(m.to[1]-m.from[1])*ch;
      anims.push(el.animate([{transform:"translate(0,0)",opacity:1},{transform:`translate(${dx}px,${dy}px)`,opacity:m.wrapped?0:1}],
        {duration:animDur(520),easing:"ease-in-out",fill:"forwards"}).finished);
    }));
    flow.blocks.forEach(bk=>els(bk.ids).forEach(el=>anims.push(el.animate([{transform:"translate(0,0)"},{transform:`translate(${v.dx*cw*.12}px,${v.dy*ch*.12}px)`},{transform:"translate(0,0)"}],
      {duration:animDur(360),easing:"ease-out"}).finished)));
    await Promise.all(anims);
    state.bottles.forEach(w=>{const p=flow.pos[w.id]; if(p){w[0]=p[0];w[1]=p[1];}});
    flow.entangles.forEach(e=>e.ids.forEach(id=>{const w=state.bottles.find(x=>x.id===id);if(w)w.entangled=true;}));
    steps.push(flow);
    clearSimCache();
    renderBoard();
    board.classList.remove("flowing"); banner.classList.remove("updating");
    if (flow.entangles.length) notes.push("🪢 風把塑膠袋推向礁石，形成了纏繞。");
    if (flow.splits.length) notes.push("🫧 風使含塑膠袋的聚集撞上礁石並拆分。");
  }
  renderEnvironmentBanner();
  return { notes, steps, env };
}

// ===== 畫面 =====
const icon = (id, rot = 0) => `<svg viewBox="0 0 40 40" style="transform:rotate(${rot}deg)"><use href="#${id}"/></svg>`;
const board = document.getElementById("board");
function renderBoard() {
  const perfT0 = performance.now();
  const ship = state.ship;
  document.getElementById("board-cols").innerHTML = `<span></span>` + [...COLS].map(c => `<span class="ax">${c}</span>`).join("");
  document.getElementById("board-rows").innerHTML = Array.from({length:MAP_SIZE}, (_,i) => `<span class="ax">${i+1}</span>`).join("");
  const fogIds = fogHiddenIds();
  document.body.dataset.fog = fogIds.size ? "1" : "0";
  let html = "";
  for (let y = 1; y <= MAP_SIZE; y++) {
    html += `<span class="ax">${y}</span>`;
    for (let x = 1; x <= MAP_SIZE; x++) {
      const name = cellName(x, y);
      let cls = "cell", inner = `<span class="coord">${name}</span>`;
      if (x === LEVEL.zoneA[0] && y === LEVEL.zoneA[1]) {
  cls += " dock dock-a";
  inner += `
    <img class="dock-img"
         src="assets/ports/port_A.png"
         alt="回收區">
    
  `;
}
else if (x === LEVEL.zoneB[0] && y === LEVEL.zoneB[1]) {
  cls += " dock dock-b";
  inner += `
    <img class="dock-img"
         src="assets/ports/port_B.png"
         alt="垃圾區">
    
  `;
}

/* 一定要放在 A/B 判斷的外面 */
const ws = state.bottles.filter(
  ([a, b]) => a === x && b === y
);

if (ws.length === 1) {
        const hiddenByFog = fogIds.has(ws[0].id) && !(pendingPrediction && pendingPrediction.targetId === ws[0].id);
        if (hiddenByFog) inner += `<span class="fog-mark" title="霧中看不清楚">🌫️</span>`;
        else {
  const info = wasteInfoOf(ws[0]);

  inner += `
    <img
      class="waste-img ${ws[0].entangled ? "entangled-waste" : ""}"
      src="${info.image}"
      alt="${info.label}"
      data-wid="${ws[0].id}"
    >
  `;
}
      } else if (ws.length > 1) {
  cls += " cluster";

  ws.forEach((w, k) => {
    const hiddenByFog =
      fogIds.has(w.id) &&
      !(pendingPrediction && pendingPrediction.targetId === w.id);

    if (hiddenByFog) {
      inner += `
        <span
          class="fog-mark fog-${k}"
          title="霧中看不清楚">
          🌫️
        </span>
      `;
    } else {
      const info = wasteInfoOf(w);

      inner += `
        <img
          class="waste-img w2 w2-${k} ${w.entangled ? "entangled-waste" : ""}"
          src="${info.image}"
          alt="${info.label}"
          data-wid="${w.id}"
        >
      `;
    }
  });
}
      if (pendingPrediction && pendingPrediction.targetId != null && ws.some(w => w.id === pendingPrediction.targetId)) cls += " pred-target-cell";
      if (has(LEVEL.reefs, x, y)) {
  inner += `
    <img
      class="reef-img"
      src="assets/reef/reef_large.png"
      alt="礁石"
    >
  `;}
      if (ship.x === x && ship.y === y) {
  const shipRot = {
    up: 0,
    right: 90,
    down: 180,
    left: 270
  }[ship.dir];

  inner += `
    <img
      class="ship-img"
      src="assets/ship/ship.png"
      alt="海洋清理船"
      style="transform:translate(-50%,-50%) rotate(${shipRot}deg)"
    >
  `;
}
      if (debug.ship && debug.ship.x === x && debug.ship.y === y) {
        cls += " ghost-cell";
        inner += icon("i-ship", DIR_ROT[debug.ship.dir]).replace("<svg ", '<svg class="ghost" ');
      }
      if (highlightCell && highlightCell.x === x && highlightCell.y === y) cls += " target";
      if (predPickedCell() === name) cls += " pred-cell";
      html += `<div class="${cls}" aria-label="${name}">${inner}</div>`;
    }
  }
  board.innerHTML = html;
  const ts = debug.ship || ship;
  document.getElementById("t-state").textContent = `${debug.ship ? "測試船" : "正式船"}：${cellName(ts.x, ts.y)}　${DIR_LABEL[ts.dir]}`;
  renderEnvironmentBanner();
  perfMark("renderBoard", perfT0);
}

const hintBox = document.getElementById("hint");
const DEFAULT_HINT = document.getElementById("hint-msg").innerHTML;
/** 第一個寶特瓶的一次性教學提示：第一次拾取成功前，一直留在提示區 */
let firstPickupTutorialDone = false;
let hintIsDefault = true;
function renderTutorial() {
  const active = LEVEL.tutorial && !firstPickupTutorialDone;
  document.getElementById("hint-tutorial").hidden = !active;
  document.getElementById("hint-title").hidden = hintIsDefault && active;
  document.getElementById("hint-msg").hidden = hintIsDefault && active;
  hintBox.hidden = hintIsDefault && !active;   // 提示區只在需要時出現
}
function showHint(kind, title, msg) {
  hintIsDefault = msg === DEFAULT_HINT;
  hintBox.classList.toggle("is-error", kind === "error");
  hintBox.classList.toggle("is-ok", kind === "ok");
  document.getElementById("hint-title").textContent = title;
  document.getElementById("hint-msg").innerHTML = msg;
  renderTutorial();
}
function errorText(res) {
  const where = cellName(res.target.x, res.target.y);
  if (res.error === "REEF") return `那一格（${where}）是礁石！小船停在原地，這次測試停止。按「重設」再試一次。`;
  return `再走就會開出地圖了！小船停在原地，這次測試停止。按「重設」再試一次。`;
}

// ===== 卡牌：牌庫／手牌／棄牌堆 =====
const DECK_RECIPE = { forward: 8, backward: 4, turnLeft: 5, turnRight: 5 };
const HAND_SIZE = 5;
const CARD_ICON = { forward: "i-fwd", backward: "i-back", turnLeft: "i-left", turnRight: "i-right", loop: "i-loop" };
const LOOP_TIMES = 2;
const MOVE_TYPES = ["forward", "backward", "turnLeft", "turnRight"];   // 迴圈裡只能放這四種
const STEP_MS = { highlight: 300, after: 350 };   // 每張約 650ms
const cards = { drawPile: [], hand: [], discardPile: [] };
let program = [];          // 程式列：{kind:"card", id} 手牌 或 {kind:"cmd", type} 常駐指令
/** 程式列中用到的所有手牌 id（含迴圈卡與迴圈裡的卡） */
const programCardIds = list => {
  const out = [];
  (list || program).forEach(it => {
    if (it.kind === "card") out.push(it.id);
    else if (it.kind === "loop") { out.push(it.id); it.body.forEach(b => out.push(b.id)); }
  });
  return out;
};
let openLoop = null;   // 正在編輯（可以往裡面放卡）的迴圈
let loopTutorialShown = false;
/** Level 2 專屬狀態（Level 1 不會用到） */
const lv2 = {
  introShown: {},                                   // 這次開啟網頁裡已自動播過開場教學的關卡
  tips: { reef: false, cluster: false, clusterPickup: false, entangle: false, split: false },   // 一次性提示（重新開始本關時重設）
  tutorPos: 0,                                      // 前三次教學型預判進行到第幾個
};   // 1-4 第一次使用迴圈的提示是否已出現（重新開始本關時重設）
let running = false;
let swapMode = false;
let swapSel = new Set();

function buildDeck() {
  const deck = []; let id = 1;
  for (const [type, n] of Object.entries(LEVEL.deck || DECK_RECIPE))
    for (let k = 0; k < n; k++) deck.push({ id: id++, type });
  return deck;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** 抽 1 張；抽牌堆空了就把棄牌堆洗回去 */
function reshuffleDiscardIntoDraw() {
  cards.drawPile = shuffle(cards.discardPile);
  cards.discardPile = [];
}
function drawOne() {
  if (cards.drawPile.length === 0) {
    if (cards.discardPile.length === 0) return null;
    reshuffleDiscardIntoDraw();
  }
  return cards.drawPile.pop();
}
/** 把新牌插回原本的空位（slots = 被丟掉的手牌位置），沒有空位資訊就接在最後 */
function insertIntoHand(card, slots) {
  const pos = slots.length ? slots.shift() : cards.hand.length;
  cards.hand.splice(Math.min(pos, cards.hand.length), 0, card);
}
function refillHand(slots = []) {
  const sl = slots.slice().sort((a, b) => a - b), added = [];
  while (cards.hand.length < HAND_SIZE) {
    const c = drawOne();
    if (!c) break;
    insertIntoHand(c, sl); added.push(c.id);
  }
  return added;
}
/** 有動畫的補牌：抽牌堆用完時先播「重新洗牌」 */
async function refillHandAnimated(slots = []) {
  const sl = slots.slice().sort((a, b) => a - b), added = [];
  while (cards.hand.length < HAND_SIZE) {
    if (cards.drawPile.length === 0) {
      if (cards.discardPile.length === 0) break;
      await playReshuffle(reshuffleDiscardIntoDraw);
    }
    const c = cards.drawPile.pop();
    insertIntoHand(c, sl); added.push(c.id);
  }
  return added;
}
function isValidOpeningHand(hand) {
  return hand.some(c => c.type === "forward") && hand.some(c => c.type === "turnLeft" || c.type === "turnRight");
}
/** 第一手：至少 1 張前進、至少 1 張左轉或右轉 */
function dealOpeningHand() {
  do {
    cards.drawPile = shuffle(buildDeck());
    cards.discardPile = [];
    cards.hand = cards.drawPile.splice(-HAND_SIZE);
  } while (LEVEL.openingGuarantee !== false && !isValidOpeningHand(cards.hand));
}
/** 丟牌（依 ids 順序進棄牌堆，最後一張成為最上面），回傳它們原本在手牌的位置 */
function discardCards(ids) {
  const set = new Set(ids);
  const slots = [];
  cards.hand.forEach((c, i) => { if (set.has(c.id)) slots.push(i); });
  ids.forEach(id => { const c = cards.hand.find(h => h.id === id); if (c) cards.discardPile.push(c); });
  cards.hand = cards.hand.filter(c => !set.has(c.id));
  return slots;
}

// ===== 牌堆動畫（可重用） =====
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const animDur = ms => reduceMotion ? 0 : ms;
function bump(el) {
  if (!reduceMotion) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 240 });
}
/** 卡片縮小、往棄牌堆移動、消失。用固定定位的複製品飛，原位保留空位，不會跑版 */
function flyToDiscard(els) {
  const target = document.getElementById("discard-stack").getBoundingClientRect();
  const tx = target.left + target.width / 2, ty = target.top + target.height / 2;
  return Promise.all(els.filter(Boolean).map((el, i) => {
    const r = el.getBoundingClientRect();
    const c = el.cloneNode(true);
    c.removeAttribute("data-id"); c.removeAttribute("data-idx");
    Object.assign(c.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px",
      margin: "0", zIndex: "50", pointerEvents: "none", transform: "none", opacity: "1", animation: "none" });
    document.body.appendChild(c);
    el.style.visibility = "hidden";
    const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
    return c.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * .12}px,${dy * .12}px) scale(.75)`, opacity: 1, offset: .35 },
      { transform: `translate(${dx}px,${dy}px) scale(.18)`, opacity: .15 }
    ], { duration: animDur(400), delay: animDur(i * 40), easing: "ease-in", fill: "forwards" }).finished.then(() => c.remove());
  }));
}
/** 重新洗牌：棄牌堆縮小 → 換堆 → 抽牌堆重新出現，並顯示短訊息 */
async function playReshuffle(doReshuffle) {
  const ds = document.getElementById("discard-stack"), dr = document.getElementById("draw-stack");
  await ds.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.3)", opacity: 0 }], { duration: animDur(260), easing: "ease-in" }).finished;
  doReshuffle();
  renderPiles();
  const toast = document.getElementById("shuffle-toast");
  toast.hidden = false;
  clearTimeout(playReshuffle.t);
  playReshuffle.t = setTimeout(() => { toast.hidden = true; }, 1400);
  await dr.animate([{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: animDur(280), easing: "ease-out" }).finished;
}
const findCard = id => cards.hand.find(c => c.id === id);

// ===== 程式編排 =====
/** 1-2～1-5：程式內容一改，尚未 RUN 的預判（含 1-5 的位置／方向草稿）就不再對應目前程式 → 清掉，讓學生重新預測。1-1 不受影響。 */
function invalidatePendingPrediction() {
  clearSimCache();
  if (LEVEL.predTrigger) pendingPrediction = null;
}
function addToProgram(id) {
  if (running || swapMode || programCardIds().includes(id)) return;   // 同一張實體牌只能用一次
  const card = findCard(id);
  if (card.type === "loop") {
    if (openLoop) { showHint("error", "不能放進迴圈", "迴圈裡不能再放另一個迴圈。請先按「結束迴圈」。"); return; }
    openLoop = { kind: "loop", id, body: [] };
    program.push(openLoop);
    if (LEVEL.loopTutorial && !loopTutorialShown) {
      // 1-4：第一次使用迴圈的一次性提示（只教操作，不給路線）
      loopTutorialShown = true;
      showHint("", "第一次使用迴圈", "迴圈可以把一段「重複的移動」執行兩次。<br>試著找找地圖上有沒有重複的路徑。<br><small>操作方式：點【迴圈 ×2】→ 放入移動卡 → 點【結束迴圈】</small>");
    } else {
      showHint("", "迴圈", "現在點的移動卡（前進、後退、左轉、右轉）會放進迴圈裡。放好後按「結束迴圈」。");
    }
  } else if (openLoop) {
    openLoop.body.push({ kind: "card", id });
  } else {
    program.push({ kind: "card", id });
  }
  invalidatePendingPrediction();
  renderCards();
}
/** 常駐指令可重複加入，不消耗手牌；不能放進迴圈 */
function addCommandToProgram(type) {
  if (running || swapMode) return;
  if (openLoop) { showHint("error", "不能放進迴圈", "拾取、卸載、解纏不能放進迴圈。請先按「結束迴圈」。"); return; }
  program.push({ kind: "cmd", type });
  invalidatePendingPrediction();
  renderCards();
}
function closeLoop() {
  if (running) return;
  openLoop = null;
  showHint("", "提示", DEFAULT_HINT);
  renderCards();
}
/** path："3" 是第 4 個項目；"3.1" 是第 4 個項目（迴圈）裡的第 2 張卡 */
function removeFromProgram(path) {
  if (running) return;
  const [i, j] = String(path).split(".").map(Number);
  if (Number.isInteger(j)) program[i].body.splice(j, 1);
  else { if (program[i] === openLoop) openLoop = null; program.splice(i, 1); }
  invalidatePendingPrediction();
  renderCards();
}

// ===== RUN =====
/** 條件不成立時暫停 RUN，等學生按「繼續執行」（RUN 仍在進行中，所以程式、手牌、換牌、RUN 都維持鎖定） */
let continueResolver = null;
function waitForContinue() {
  return new Promise(resolve => {
    const btn = document.getElementById("btn-continue");
    btn.hidden = false;
    continueResolver = () => { btn.hidden = true; continueResolver = null; resolve(); };
    const r = btn.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) btn.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    btn.focus({ preventScroll: true });
  });
}
function wasteBlockedText(type) {
  return `移動失敗：${type === "backward" ? "後方" : "前方"}有海廢，請從右側作業區進行拾取。`;
}
/** RUN 是否可用：只看遊戲條件，不看教師模式或開發工具 */
/** Level 2：第一次預判還沒完成時，RUN 旁顯示原因，預判卡輕輕亮著提醒往下看 */
function firstPredictionLocked() {
  if (!LEVEL.predLockFirst || running || swapMode || records.predictions.length > 0 || !programCardIds().length) return false;
  const p = currentPrediction();
  return !!(p && p.answer === null);
}
function updateRunLock() {
  const locked = firstPredictionLocked();
  document.getElementById("run-lock").hidden = !locked;
  document.getElementById("pred-card").classList.toggle("lock-glow", locked);
}
function canRun() {
  if (running || swapMode || programCardIds().length === 0) return false;
  // Level 2：第一次預判必須作答或略過才能 RUN（之後不限制）
  if (LEVEL.predLockFirst && records.predictions.length === 0) { const p = currentPrediction(); if (p && p.answer === null) return false; }
  return true;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function runProgram() {
  if (!canRun()) return;
  const perfT0 = performance.now();
  running = true;
  state.turns++;   // 按下 RUN 就算 1 回合（中途重大錯誤或條件不成立也一樣）
  renderTurns();
  const pred = currentPrediction();   // 本次 RUN 若有預測題，鎖定學生的回答（沒回答也照常執行）
  renderPrediction();
  openLoop = null;   // RUN 時自動結束迴圈編輯
  const submitted = program.slice();
  const marks = {}, reasons = {}, loopPass = {};
  const steps = [];
  let firstUnloadZone = null;
  let firstFullCargo = null;   // 1-3 預測用：這次 RUN 中貨艙第一次變滿時的內容
  let loopEndCell = null;      // 1-4 預測用：這次 RUN 第一個迴圈結束（或停止）時船的位置
  let loopEndIncomplete = false;
  const runNotes = [];         // Level 2 一次性提示
  const predFrom = pred && pred.targetId != null ? (w => w ? cellName(w[0], w[1]) : null)(state.bottles.find(w => w.id === pred.targetId)) : null;
  renderControls();
  // Level 2：主要提示區不再每一步換字，整段 RUN 只顯示「執行程式中…」（每一步結果仍在程式高亮與執行紀錄裡）
  const calmHints = !!LEVEL.current;
  const runningHint = () => showHint("", "執行程式中…", "小船正在依照程式執行。");
  if (calmHints) runningHint();
  let fatal = null;
  const R = () => renderProgram(marks, reasons, loopPass);
  const posNow = () => ({ pos: cellName(state.ship.x, state.ship.y), dir: state.ship.dir });
  const itemLabel = it => it.kind === "cmd" ? CMD_LABEL[it.type] : ACTION_LABEL[findCard(it.id).type];
  /** 執行一張移動卡，回傳 "ok"／"warn"（條件不成立，已暫停並繼續）／"fatal"（重大錯誤） */
  async function execMove(type, key, n, label) {
    marks[key] = "active"; R();
    await sleep(STEP_MS.highlight);
    const res = executeAction(state.ship, type);
    state.execCount++;   // 這個指令已被系統執行並判定（成功、條件不成立、重大錯誤都算）
    if (!res.ok && res.fatal) {
      fatal = res;
      const why = res.error === "REEF" ? `${type === "backward" ? "後方" : "前方"} ${cellName(res.target.x, res.target.y)} 是礁石` : "會開出地圖";
      marks[key] = "failed"; reasons[key] = res.error === "REEF" ? "撞礁" : "出界";
      steps.push({ n, label, status: "fatal", reason: `重大錯誤：${why}，船留在原位，RUN 停止。`, ...posNow() });
      R();
      showHint("error", "重大錯誤", errorText(res).replace("這次測試停止。按「重設」再試一次。", "RUN 停止了。"));
      return "fatal";
    }
    if (!res.ok && res.blocked === "WASTE") {
      steps.push({ n, label, status: "warn", reason: wasteBlockedText(type), ...posNow() });
      marks[key] = "warn"; reasons[key] = "前方有海廢"; R();
      showHint("error", "條件不成立", `第 ${n} 步「${label}」無法執行。<br>${type === "backward" ? "後方" : "前方"}有海廢，小船不能直接開進去。<br>請從右側作業區進行拾取。`);
      await waitForContinue();
      if (calmHints) runningHint();
      return "warn";
    }
    state.ship = res.ship; renderBoard();
    steps.push({ n, label, status: "ok", ...posNow() });
    if (!calmHints) showHint("ok", "執行中", `第 ${n} 步：${label} → ${cellName(state.ship.x, state.ship.y)}，${DIR_LABEL[state.ship.dir]}`);
    await sleep(STEP_MS.after);
    marks[key] = "done"; R();
    return "ok";
  }
  /** 重大錯誤後：後面還沒執行的項目全部標成未執行 */
  function skipAfter(i) {
    for (let k = i + 1; k < submitted.length; k++) {
      marks[k] = "skipped";
      const it = submitted[k];
      if (it.kind === "loop") it.body.forEach((_, j) => { marks[`${k}.${j}`] = "skipped"; });
      steps.push({ n: k + 1, label: itemLabel(it), status: "skipped", reason: "沒有執行（RUN 已停止）" });
    }
  }
  for (let i = 0; i < submitted.length; i++) {
    const item = submitted[i];
    if (item.kind === "loop") {
      marks[i] = "active"; R();
      await sleep(STEP_MS.highlight);
      if (!item.body.length) {
        marks[i] = "warn"; reasons[i] = "迴圈是空的"; R();
        steps.push({ n: i + 1, label: ACTION_LABEL.loop, status: "warn", reason: "迴圈裡沒有移動卡，沒有重複任何動作。", ...posNow() });
        showHint("error", "條件不成立", `第 ${i + 1} 步「${ACTION_LABEL.loop}」無法執行。<br>迴圈裡沒有任何移動卡。`);
        await waitForContinue();
        if (calmHints) runningHint();
        if (!loopEndCell) { loopEndCell = cellName(state.ship.x, state.ship.y); loopEndIncomplete = true; }
        continue;
      }
      // 迴圈：把包住的移動序列完整重複 LOOP_TIMES 次
      for (let pass = 1; pass <= LOOP_TIMES && !fatal; pass++) {
        loopPass[i] = pass;
        item.body.forEach((_, j) => { if (marks[`${i}.${j}`] === "done") marks[`${i}.${j}`] = ""; });
        for (let j = 0; j < item.body.length; j++) {
          const type = findCard(item.body[j].id).type;
          const r = await execMove(type, `${i}.${j}`, `${i + 1}-${j + 1}`, `${ACTION_LABEL[type]}（迴圈第 ${pass} 次）`);
          if (r === "fatal") { for (let k = j + 1; k < item.body.length; k++) marks[`${i}.${k}`] = "skipped"; break; }
        }
      }
      if (!loopEndCell) { loopEndCell = cellName(state.ship.x, state.ship.y); loopEndIncomplete = !!fatal; }
      if (fatal) { marks[i] = "failed"; skipAfter(i); R(); break; }
      state.loopsUsed++;
      marks[i] = "done"; R();
      steps.push({ n: i + 1, label: ACTION_LABEL.loop, status: "ok", reason: `迴圈裡的 ${item.body.length} 張移動卡重複執行了 ${LOOP_TIMES} 次。`, ...posNow() });
      continue;
    }
    marks[i] = "active"; R();
    if (item.kind === "cmd") {
      await sleep(STEP_MS.highlight);
      const cell = getRightSideCell(state.ship);
      const before = { content: describeCell(cell.x, cell.y), cargo: state.cargo.length };
      const r = COMMANDS[item.type](state);
      state.execCount++;
      if (r.ok && r.cluster && LEVEL.current && !lv2.tips.clusterPickup) { lv2.tips.clusterPickup = true; runNotes.push("📦 一次「拾取」會把整個聚集一起撿進貨艙，不會只撿一部分。"); }   // 拾取／卸載：成功或條件不成立都算 1 個執行指令
      if (r.ok && item.type === "pickup") firstPickupTutorialDone = true;   // 第一次拾取成功 → 教學提示結束
      if (r.ok && item.type === "unload" && !firstUnloadZone) firstUnloadZone = r.zone;   // 1-2 預測用
      if (r.ok && item.type === "pickup" && !firstFullCargo && state.cargo.length === cargoCapacity()) firstFullCargo = cargoKey(state.cargo.map(it => it.kind));
      highlightCell = isInsideMap(cell.x, cell.y) ? cell : null;
      renderBoard(); renderCargo();
      steps.push({ n: i + 1, label: CMD_LABEL[item.type], status: r.ok ? "ok" : "warn", reason: r.msg,
        ...posNow(),
        right: { cell: isInsideMap(cell.x, cell.y) ? cellName(cell.x, cell.y) : "地圖外", content: before.content },
        cargo: `${before.cargo}→${state.cargo.length}` });
      if (r.ok) {
        if (calmHints) runNotes.push(`✔ ${CMD_LABEL[item.type]}：${r.msg}`);   // Level 2：成功結果留到本回合結束一起顯示
        else showHint("ok", `${CMD_LABEL[item.type]}成功`, `第 ${i + 1} 步：${r.msg}`);
        await sleep(STEP_MS.after + 150);
      } else {
        // 條件不成立：標記這一步，暫停到學生按「繼續執行」
        marks[i] = "warn"; reasons[i] = r.msg;
        R();
        showHint("error", "條件不成立", `第 ${i + 1} 步「${CMD_LABEL[item.type]}」無法執行。<br>${r.msg}`);
        await waitForContinue();
        if (calmHints) runningHint();
      }
      highlightCell = null; renderBoard();
      marks[i] = r.ok ? "done" : "warn";
      R();
      continue;
    }
    const type = findCard(item.id).type;
    const r = await execMove(type, String(i), i + 1, ACTION_LABEL[type]);
    if (r === "fatal") { skipAfter(i); R(); break; }
  }
  // Level 2：回合結束 → 洋流更新（重大錯誤停止也一樣）→ 再比較預判、判定任務
  let fatalHtml = null;
  if (LEVEL.current) {
    if (fatal) { fatalHtml = document.getElementById("hint-msg").innerHTML; await sleep(900); }   // 先讓學生看清楚重大錯誤
    showHint("", "🌊 洋流更新", "程式執行完了，海廢正在受到洋流影響漂移…");
    const res = await applyCurrentUpdate();
    runNotes.push(...res.notes);
    if (LEVEL.wind || LEVEL.weatherSeq) {
      showHint("", "💨 風影響", "洋流更新完成，現在依本回合風向與風力移動海廢…");
      const wr = await applyWindUpdate();
      runNotes.push(...wr.notes);
    }
  }
  // 寫入正式紀錄（開發工具不會走到這裡）
  const targetNow = pred && pred.targetId != null ? state.bottles.find(w => w.id === pred.targetId) : null;
  const actual = LEVEL.prediction === "wasteAfter" ? (targetNow ? cellName(targetNow[0], targetNow[1]) : "picked")
    : LEVEL.prediction === "firstZone" ? (firstUnloadZone || "none")
    : LEVEL.prediction === "firstFull" ? (firstFullCargo || "none")
    : LEVEL.prediction === "loopEnd" ? (loopEndCell || "none")
    : LEVEL.prediction === "endPose" ? `${cellName(state.ship.x, state.ship.y)}:${state.ship.dir}`
    : state.ship.dir;
  const no = ++records.runCount;
  let prediction = null;
  if (pred) {
    const answered = predType().isAnswer ? predType().isAnswer(pred.answer) : predType().options.includes(pred.answer);
    prediction = { no, kind: LEVEL.prediction, style: LEVEL.predTrigger ? "compare" : "classic",
      loopIncomplete: LEVEL.prediction === "loopEnd" && loopEndIncomplete,
      ...(LEVEL.prediction === "wasteAfter" ? { style: "current", targetId: pred.targetId, targetLabel: pred.targetLabel, from: predFrom, fatal: !!fatal } : {}),
      status: answered ? "answered" : pred.answer === "skip" ? "skipped" : "unanswered",
      fog: !!environmentForTurn(state.turns).fog,
      predicted: answered ? pred.answer : null, actual, match: answered ? pred.answer === actual : null };
    records.predictions.push(prediction);
    if (pred.tutor != null) lv2.tutorPos = pred.tutor + 1;   // 教學型預判往下一個
    pendingPrediction = null;
  }
  // 任務判定：整次 RUN 跑完（或因重大錯誤停止）後才判定；中途達成不會提前停止
  const isFreePlayRun = state.freePlay;
  let justCompleted = false;
  if (!state.completed && isLevelGoalMet()) {
    state.completed = true; state.completedAtRun = no; state.completedWithFatal = !!fatal;
    state.completedStats = { turns: state.turns, swaps: state.swapCount, execs: state.execCount };   // 正式成績：只記第一次完成的那一刻
    justCompleted = true;
  }
  records.runHistory.unshift({ no, prediction, actual, fatal: !!fatal, steps, freePlay: isFreePlayRun, completed: justCompleted });
  records.runHistory = records.runHistory.slice(0, HISTORY_LIMIT);
  renderHistory();
  // Level 2：洋流動畫結束 → 「本回合結束」至少停留約 1.2 秒，才恢復一般操作
  const turnEndAt = Date.now();
  if (LEVEL.current) {
    const notes = runNotes.map(n => `<br><small>${n}</small>`).join("");
    if (fatal) showHint("error", "本回合結束", `${fatalHtml}<br><small>🌊 回合結束，洋流仍然更新了一次。</small>${notes}`);
    else showHint("ok", "本回合結束", `小船停在 ${cellName(state.ship.x, state.ship.y)}，${DIR_LABEL[state.ship.dir]}。<br><small>${LEVEL.wind || LEVEL.weatherSeq ? "🌊 洋流與 💨 風已依序更新。" : "🌊 洋流已更新。"}</small>${notes}`);
  }
  // 有錯誤時多停一下，讓學生看清楚標記
  await sleep(steps.some(st => st.status !== "ok") ? 1400 : 600);
  // 本次提交的手牌（含未執行到的）全部飛進棄牌堆；常駐指令不進棄牌堆
  const usedIds = programCardIds(submitted);
  usedIds.forEach(id => { const h = document.querySelector(`#hand [data-id="${id}"]`); if (h) h.style.visibility = "hidden"; });
  document.querySelectorAll("#program [data-cmdslot]").forEach(el => { el.style.visibility = "hidden"; });
  await flyToDiscard(usedIds.map(id => document.querySelector(`#program [data-cid="${id}"]`)));
  const slots = discardCards(usedIds);
  program = [];   // 新的編輯區：舊的錯誤標記一起清掉，紀錄留在歷史面板
  renderProgram(); renderPiles(); bump(document.getElementById("pile-discard"));
  const added = await refillHandAnimated(slots);
  if (LEVEL.current) await sleep(Math.max(0, TURN_END_HOLD - (Date.now() - turnEndAt)));   // 本回合結束至少停留 TURN_END_HOLD
  running = false;
  if (!fatal && !LEVEL.current) showHint("ok", "RUN 完成", `小船停在 ${cellName(state.ship.x, state.ship.y)}，${DIR_LABEL[state.ship.dir]}。已補回手牌。`);
  if (!fatal && LEVEL.requireLoop && !state.loopsUsed && !state.completed && deliveriesDone())
    showHint("", "還差一步", "海廢已經卸載足夠了，還需要成功使用 1 次迴圈才能完成任務。");
  clearSimCache();   // RUN 完成：船、海廢、貨艙、程式都換了
  try {
    renderCards(added);   // 有 predTrigger 的關卡（1-2～1-5、2-1）這裡已經會 renderPrediction()＋renderBoard()
    if (!LEVEL.predTrigger) {   // 1-1 沒有 predTrigger，維持原本另外更新
      renderPrediction();
      renderBoard();   // 清掉上一題預測在地圖上的標記
    }
    if (prediction && prediction.style === "current") flashPath(prediction.from, prediction.actual);
    renderMissionStatus();
  } finally {
    // 完成任務時，所有畫面更新之後一定打開結算視窗（就算前面的畫面更新出錯也一樣）
    if (justCompleted) openSettlement();
    else if (isFreePlayRun) showHint("ok", "自由操作", "這次是自由操作紀錄，不會改變正式任務結果。");
    perfMark("一次完整 RUN（含動畫）", perfT0);
    if (perfOn()) { console.log(`[效能] 第 ${records.runCount} 次 RUN 後`); perfReport(); }
  }
}

// ===== 任務結算 =====
const settleDlg = document.getElementById("settle-dlg");
function openSettlement() {
  completedLevelIds.add(LEVEL.id);
  const newlyUnlocked = unlockNextLevel(LEVEL.id);
  renderLevelMap();
  const unlockEl = document.getElementById("settle-unlock");
  unlockEl.hidden = !newlyUnlocked;
  unlockEl.textContent = newlyUnlocked ? `🔓 新關卡解鎖：${LEVELS[newlyUnlocked].name}` : "";
  document.getElementById("settle-msg").textContent = state.completedWithFatal
    ? "任務完成，但本次 RUN 發生重大執行錯誤。"
    : LEVEL.completeText;
  document.getElementById("settle-title").textContent = `${LEVEL.name} 任務完成`;
  document.getElementById("settle-run").textContent = `在第 ${state.completedAtRun} 次 RUN 完成`;
  const st = state.completedStats || { turns: state.turns, swaps: state.swapCount, execs: state.execCount };
  document.getElementById("stat-turns").textContent = st.turns;
  document.getElementById("stat-swaps").textContent = st.swaps;
  document.getElementById("stat-execs").textContent = st.execs;
  settleDlg.hidden = false;
  document.getElementById("settle-free").focus();
}
function renderMissionStatus() {
  const el = document.getElementById("mission-status");
  el.textContent = state.completed ? (state.freePlay ? "已完成・自由操作中" : "已完成") : LEVEL.name;
}
document.getElementById("settle-retry").addEventListener("click", () => { settleDlg.hidden = true; restartLevel(); });
document.getElementById("settle-free").addEventListener("click", () => {
  settleDlg.hidden = true;
  state.freePlay = true;
  renderMissionStatus();
  showHint("ok", "自由操作", "可以繼續玩。之後的 RUN 會標示為「自由操作紀錄」，不會改變任務結果。");
});

// ===== 預測（低頻小卡：不彈窗、不阻擋 RUN、可略過、不計分） =====
// Level 1-1：第 2、5、8…次 RUN 才出題 → 每 3 次最多 1 次、第 1 次不出、不會連續兩次
const PREDICTION_EVERY = 3, PREDICTION_OFFSET = 2;
const isPredictionRun = no => no % PREDICTION_EVERY === PREDICTION_OFFSET % PREDICTION_EVERY && no >= PREDICTION_OFFSET;
/** 預測題型：1-1 問最後船頭方向；1-2 問這次 RUN 會先卸到 A 區還是 B 區（以第一次「成功卸載」的區域為實際結果） */
const PRED_TYPES = {
  direction: { q: "你預測這次 RUN 結束後，船頭會朝哪個方向？", options: ["up", "right", "down", "left"],
               fmt: v => DIR_ARROW[v], aria: v => DIR_LABEL[v], wide: false },
  firstZone: { intro: "船長在出發前，會先想想這次任務可能會發生什麼。",
               q: "看看你剛剛排好的程式，你覺得這次 RUN 會先在哪一區成功卸載？", options: ["A", "B", "none"],
               fmt: v => v === "none" ? "這次不會卸載" : `${v} 區`,
               fmtActual: v => v === "none" ? "這次沒有成功卸載" : `${v} 區`,
               aria: v => v === "none" ? "這次不會卸載" : `${v} 區`, wide: true },
};
/** 1-3：兩個海廢的組合（不分順序），依本關實際有的海廢數量列出可能組合 */
const cargoKey = kinds => kinds.slice().sort().join("+");
function pairOptions() {
  const count = {}; LEVEL.wastes.forEach(w => count[w[2]] = (count[w[2]] || 0) + 1);
  const kinds = Object.keys(count).sort(), out = [];
  kinds.forEach((a, i) => kinds.slice(i).forEach(b => { if (a !== b || count[a] >= 2) out.push(cargoKey([a, b])); }));
  return out;
}
PRED_TYPES.firstFull = {
  intro: "看看你這次排好的程式。",
  q: "你預測這次 RUN 中，貨艙第一次裝滿時，裡面會是哪兩個海廢？",
  fmtActual: v => v === "none" ? "這次 RUN 中貨艙沒有裝滿。" : v.split("+").map(k => WASTE_TYPES[k].label).join("＋"),
  get options() { return pairOptions(); },
  fmt: v => v === "none" ? "這次沒有裝滿" : v.split("+").map(k => WASTE_TYPES[k].label).join("＋"),
  aria: v => v.split("+").map(k => WASTE_TYPES[k].label).join("和"), wide: true,
};
PRED_TYPES.loopEnd = {
  intro: "看看你放進迴圈裡的指令。",
  q: "你覺得這個迴圈執行完後，小船會停在哪一格？",
  options: [], pickOnMap: true, isAnswer: v => /^[A-H][1-8]$/.test(v || ""),
  fmt: v => v === "none" ? "這次沒有執行迴圈" : v, aria: v => v, wide: true,
};
PRED_TYPES.endPose = {
  intro: "看看你這次排好的完整程式。",
  q: "你預測 RUN 結束後，小船會停在哪一格？船頭會朝哪個方向？",
  options: [], pickOnMap: true, needsDir: true,
  isAnswer: v => /^[A-H][1-8]:(up|right|down|left)$/.test(v || ""),
  fmt: v => { const [c, d] = v.split(":"); return `${c}，${DIR_LABEL[d]}`; }, aria: v => v, wide: true,
};
const fmtActual = (kind, v) => (predType(kind).fmtActual || predType(kind).fmt)(v);
PRED_TYPES.wasteAfter = {
  q: "你覺得這回合結束後，預判目標會在哪一格？",
  options: [], pickOnMap: true, isAnswer: v => /^[A-H][1-8]$/.test(v || ""),
  fmt: v => v === "picked" ? "已被撿進貨艙" : v, aria: v => v, wide: true,
};
/** 效能檢查（只在教師模式或 #dev 記錄，學生看不到；console 輸入 perfReport() 可查看） */
const PERF = {};
const perfOn = () => document.body.dataset.mode === "teacher" || document.body.dataset.dev === "1";
function perfMark(name, t0) {
  if (!perfOn()) return;
  const d = performance.now() - t0, s = PERF[name] || (PERF[name] = { 次數: 0, 總毫秒: 0, 最大毫秒: 0 });
  s.次數++; s.總毫秒 = +(s.總毫秒 + d).toFixed(2); s.最大毫秒 = +Math.max(s.最大毫秒, d).toFixed(2);
}
function perfReport() { console.table(PERF); return PERF; }
/**
 * 模擬結果暫存：同一個畫面狀態（關卡、程式內容、船位置／方向、海廢位置、貨艙）只模擬一次。
 * key 由這些內容直接組成，任何一項改變 key 就不同 → 一定重新計算，不會拿到舊結果；
 * 另外在改程式、RUN、洋流更新、換牌、重新開始／切換關卡時也會主動清掉。
 */
let simCache = null;
const clearSimCache = () => { simCache = null; };
function simKey() {
  const t = id => (findCard(id) || {}).type;
  return JSON.stringify([LEVEL.id,
    program.map(it => it.kind === "cmd" ? ["c", it.type] : it.kind === "loop" ? ["l", it.id, it.body.map(b => [b.id, t(b.id)])] : [it.id, t(it.id)]),
    state.ship, state.bottles.map(w => [w.id, ...w, !!w.entangled]), state.cargo, state.untangles, state.turns, environmentForTurn(state.turns + 1)]);
}
/** 不改任何真正狀態，模擬「這次程式 RUN 完＋洋流更新」的結果（給 Level 2 選預判目標用） */
function simulateTurn() {
  const key = simKey();
  if (simCache && simCache.key === key) { if (perfOn()) PERF.模擬暫存命中 = (PERF.模擬暫存命中 || 0) + 1; return simCache.result; }
  const t0 = performance.now();
  const result = simulateTurnRaw();
  simCache = { key, result };
  perfMark("simulateTurn", t0);
  return result;
}
function simulateTurnRaw() {
  const saved ={ ship: state.ship, bottles: state.bottles, cargo: state.cargo, delivered: state.delivered, dz: state.deliveredByZone, dk: state.deliveredByKind, untangles: state.untangles };
  state.ship = { ...state.ship };
  state.bottles = state.bottles.map(w => { const a = w.slice(); a.id = w.id; a.entangled = !!w.entangled; return a; });
  state.cargo = state.cargo.map(c => ({ ...c }));
  state.deliveredByZone = { ...state.deliveredByZone }; state.deliveredByKind = { ...state.deliveredByKind };
  let fatal = false;
  const step = type => { const r = executeAction(state.ship, type); if (!r.ok && r.fatal) fatal = true; else if (r.ok) state.ship = r.ship; };
  try {
    for (const it of program) {
      if (fatal) break;
      if (it.kind === "cmd") COMMANDS[it.type](state);
      else if (it.kind === "card") step(findCard(it.id).type);
      else if (it.kind === "loop") for (let p = 0; p < LOOP_TIMES && !fatal; p++) for (const b of it.body) { step(findCard(b.id).type); if (fatal) break; }
    }
    const remaining = new Set(state.bottles.map(w => w.id));
    const events = {};
    const collect = (flow, phase) => {
      flow.moves.forEach(m => m.ids.forEach(id => { events[id] = { ...(events[id]||{}), ...(m.wrapped?{wrap:true}:{}), ...(m.special==="entangle"?{entangle:true}:{}), ...(phase==="wind"?{wind:true}:{}) }; }));
      flow.entangles.forEach(e => e.ids.forEach(id => { events[id] = { ...(events[id]||{}), entangle:true, ...(phase==="wind"?{wind:true}:{}) }; }));
      flow.splits.forEach(sp => sp.plasticIds.forEach(id => { events[id] = { ...(events[id]||{}), entangle:true, split:true, ...(phase==="wind"?{wind:true}:{}) }; }));
      flow.blocks.forEach(bk => bk.ids.forEach(id => { events[id] = { ...(events[id]||{}), block:true, reason:bk.reason, ...(phase==="wind"?{wind:true}:{}) }; }));
      flow.clusters.forEach(([x,y]) => Object.entries(flow.pos).forEach(([id,p])=>{if(p[0]===x&&p[1]===y) events[id]={...(events[id]||{}),cluster:true,...(phase==="wind"?{wind:true}:{})};}));
      state.bottles.forEach(w=>{const p=flow.pos[w.id];if(p){w[0]=p[0];w[1]=p[1];}});
      flow.entangles.forEach(e=>e.ids.forEach(id=>{const w=state.bottles.find(x=>x.id===id);if(w)w.entangled=true;}));
    };
    const flow = computeCurrent(state.bottles, state.ship);
    collect(flow, "current");
    const env = environmentForTurn(state.turns + 1);
    if (env.wind) {
      for (let n=0;n<(env.wind.strength||1);n++) collect(computeCurrent(state.bottles,state.ship,env.wind.dir),"wind");
    }
    return { remaining, events, env };
  } finally {
    state.ship = saved.ship; state.bottles = saved.bottles; state.cargo = saved.cargo;
    state.delivered = saved.delivered; state.deliveredByZone = saved.dz; state.deliveredByKind = saved.dk; state.untangles = saved.untangles;
  }
}
/** 選預判目標：前三次照教學順序（不能用就跳下一個）；之後只挑「跨邊界 > 被阻擋 > 形成聚集」的海廢；會被撿走的不選 */
function chooseCurrentTarget() {
  if (!programCardIds().length) return null;
  const sim = simulateTurn();
  const ok = id => sim.remaining.has(id) && state.bottles.some(w => w.id === id);
  const tut = LEVEL.tutorialPredictions || [];
  for (let k = lv2.tutorPos; k < tut.length; k++) {
    const t = tut[k];
    if (ok(t.waste) && (!t.event || (sim.events[t.waste] || {})[t.event])) return { id: t.waste, tutor: k };
  }
  for (const ev of ["entangle", "split", "wind", "wrap", "block", "cluster"]) {
    const id = state.bottles.map(w => w.id).sort((a, b) => a - b).find(i => ok(i) && (sim.events[i] || {})[ev]);
    if (id != null) return { id, tutor: null };
  }
  return null;
}
/** 預判結果：在地圖上短暫標出預判目標洋流前／洋流後的位置（跨邊界也看得到） */
function flashPath(from, to) {
  if (!from || !/^[A-H][1-8]$/.test(to || "")) return;
  const board = document.getElementById("board");
  const mark = (name, cls, label) => { const c = board.querySelector(`.cell[aria-label="${name}"]`); if (!c) return; c.classList.add(cls); const t = document.createElement("span"); t.className = "path-label"; t.textContent = label; c.appendChild(t); };
  const weather = !!(LEVEL.wind || LEVEL.weatherSeq);
  mark(from, "path-from", from === to ? (weather ? "環境前後：原地" : "洋流前後：原地") : (weather ? "環境前" : "洋流前"));
  if (from !== to) mark(to, "path-to", weather ? "環境後" : "洋流後");
  setTimeout(() => board.querySelectorAll(".path-from,.path-to").forEach(c => c.classList.remove("path-from", "path-to")), 3200);
  setTimeout(() => board.querySelectorAll(".path-label").forEach(t => t.remove()), 3200);
}
/** 依「這次排好的程式內容」決定要不要出題（1-2～1-5）；1-1 維持原本的出題次數 */
const countCmd = (list, type) => list.filter(it => it.kind === "cmd" && it.type === type).length;
const countMoves = list => list.reduce((n, it) =>
  n + (it.kind === "card" && MOVE_TYPES.includes(findCard(it.id)?.type) ? 1 : 0) + (it.kind === "loop" ? it.body.length : 0), 0);
const PRED_TRIGGERS = {
  hasUnload:          list => countCmd(list, "unload") >= 1,
  twoPickups:         list => countCmd(list, "pickup") >= 2,
  hasLoop:            list => list.some(it => it.kind === "loop"),
  loopAndThreeMoves:  list => list.some(it => it.kind === "loop") && countMoves(list) >= 3,
};
const predType = kind => PRED_TYPES[kind || LEVEL.prediction];
/** 地圖上要標出的預測格（1-4 的答案、1-5 的草稿或答案） */
function predPickedCell() {
  const p = pendingPrediction;
  if (!p || !predType().pickOnMap) return null;
  if (predType().needsDir) return p.answer && p.answer !== "skip" ? p.answer.split(":")[0] : (p.cell || null);
  return p.answer && p.answer !== "skip" ? p.answer : null;
}
/** 1-5：位置與方向都選好才算作答 */
function setPoseDraft(part, value) {
  const p = currentPrediction();
  if (!p || running || p.answer !== null) return;
  p[part] = value;
  if (p.cell && p.dir) p.answer = `${p.cell}:${p.dir}`;
  renderPrediction(); renderBoard();
}
let pendingPrediction = null;
let lastPredGlow = null;   // { runNo, answer: null | "up"/"right"/"down"/"left" | "skip" }
/** 下一次 RUN 若是出題回合，回傳那一題（同一回合只會有一題） */
function currentPrediction() {
  const next = records.runCount + 1;
  if (LEVEL.predTrigger === "currentEvent") {
    // Level 2：依這次程式＋洋流的模擬結果，挑一個有判斷價值的海廢當目標
    const c = chooseCurrentTarget();
    if (!c) return null;
    if (!pendingPrediction || pendingPrediction.runNo !== next || pendingPrediction.targetId !== c.id) {
      const w = state.bottles.find(b => b.id === c.id);
      pendingPrediction = { runNo: next, answer: null, targetId: c.id, tutor: c.tutor, targetLabel: `${cellName(w[0], w[1])} 的${wasteInfoOf(w).label}` };
    }
    return pendingPrediction;
  }
  if (LEVEL.predTrigger) {
    // 程式不符合條件時不出題（程式一改，舊答案已由 invalidatePendingPrediction() 清掉）
    if (!PRED_TRIGGERS[LEVEL.predTrigger](program)) return null;
  } else if (!isPredictionRun(next)) { pendingPrediction = null; return null; }
  if (!pendingPrediction || pendingPrediction.runNo !== next) pendingPrediction = { runNo: next, answer: null };
  return pendingPrediction;
}
function answerPrediction(answer) {
  const p = currentPrediction();
  if (!p || running) return;
  p.answer = answer;
  if (answer === null) { p.cell = null; p.dir = null; }   // 「改一下」：清掉 1-5 的草稿
  renderPrediction();
  if (predType().pickOnMap) renderBoard();
}
function renderPrediction() {
  const perfT0 = performance.now();
  const card =document.getElementById("pred-card"), body = document.getElementById("pred-body");
  const p = currentPrediction();
  const last = records.predictions[records.predictions.length - 1];
  const justDone = last && last.no === records.runCount && !p;
  if (p && p.answer === null && !running) {
    const pose = predType().needsDir
      ? `<p class="q" style="margin:0 0 4px">位置：<b>${p.cell || "請點地圖"}</b>　方向：</p>
         ${["up", "right", "down", "left"].map(d => `<button type="button" id="pdir-${d}" data-pdir="${d}" class="${p.dir === d ? "sel" : ""}" aria-label="${DIR_LABEL[d]}" aria-pressed="${p.dir === d}">${DIR_ARROW[d]}</button>`).join("")}`
      : "";
    const lockNote = LEVEL.predLockFirst && records.predictions.length === 0
      ? `<p class="q pred-lock">第一次預判：請在地圖上點一格作答，或按「略過」，RUN 才會解鎖。</p>` : "";
    const targetNote = p.targetLabel ? `<p class="q pred-target">預判目標：<b>${p.targetLabel}</b></p>` : "";
    const whyNote = LEVEL.predInline ? `<p class="pred-why">先想一想：你的程式執行後，再受到洋流影響，這個海廢最後會在哪裡？<small>預判不是考試，是幫你在 RUN 前先想像結果。</small></p>` : "";
    body.innerHTML = `${targetNote}${whyNote}${lockNote}${predType().intro ? `<p class="q" style="color:var(--ink-soft);margin-bottom:2px">${predType().intro}</p>` : ""}<p class="q">${predType().q}${predType().pickOnMap ? `<br><small>${predType().needsDir ? "請在地圖上點一格，再選方向。" : "請在地圖上點一格作答。"}</small>` : ""}</p>
      <div class="pred-opts">
        ${pose}
        ${predType().options.map(d => `<button type="button" id="pred-${d}" data-pred="${d}" class="${predType().wide ? "wide" : ""}" aria-label="${predType().aria(d)}">${predType().fmt(d)}</button>`).join("")}
        <button type="button" class="skip" id="pred-skip" data-pred="skip">略過</button>
      </div>`;
  } else if (p) {
    const txt = p.answer === "skip" ? "本次略過。" : p.answer ? `已記錄你的預測：<span class="arr">${predType().fmt(p.answer)}</span>` : "這次沒有回答，照常 RUN。";
    body.innerHTML = (p.targetLabel ? `<p class="q pred-target">預判目標：<b>${p.targetLabel}</b></p>` : "") + `<p class="pred-note"><span>${txt}</span>${running ? "" : `<button type="button" class="pred-link" id="pred-change" data-pred="change">改一下</button>`}</p>`;
  } else if (justDone) {
    const note = last.loopIncomplete ? `<br><small>（這個迴圈因重大錯誤停止，沒有完整執行。）</small>` : "";
    if (last.style === "current") {
      // Level 2：RUN＋洋流更新後才比較位置，不用「答對／答錯」
      const path = last.from ? `<br><small>洋流前：${last.from}　洋流後：${fmtActual(last.kind, last.actual)}<br>這是本次預判目標在洋流影響前後的位置變化。</small>` : "";
      const lines = `<br><small>預判目標：${last.targetLabel || ""}<br>你的預測：${last.status === "answered" ? predType(last.kind).fmt(last.predicted) : (last.status === "skipped" ? "略過" : "未回答")}　實際位置：${fmtActual(last.kind, last.actual)}</small>${path}`;
      const head = last.status !== "answered" ? `預判目標：${last.targetLabel || ""} 的實際位置`
        : last.match ? "和你預測的一樣！<br>海廢受到洋流影響，移動到了你預測的位置。"
        : last.fatal ? "和原本想的不一樣。<br>RUN 在執行途中提前停止，因此後續情況和原本預想不同。哪一步讓結果改變了？"
        : "和原本想的不一樣。<br>看看是哪個條件影響了它的位置？";
      body.innerHTML = `<p class="pred-note"><span>${head}${lines}</span></p>`;
    } else if (last.style === "compare") {
      // 1-2～1-5：比較預測與實際結果，不用「答對／答錯」
      body.innerHTML = last.status === "answered"
        ? (last.match
          ? `<p class="pred-note"><span>你的預測和實際結果一樣！看來你有成功預想到這次程式的執行結果。<br><small>你的預測：${predType(last.kind).fmt(last.predicted)}　實際結果：${fmtActual(last.kind, last.actual)}</small>${note}</span></p>`
          : `<p class="pred-note"><span>你的預測：<b>${predType(last.kind).fmt(last.predicted)}</b><br>實際結果：<b>${fmtActual(last.kind, last.actual)}</b>${note}<br>哪一步和你原本想的不一樣呢？</span></p>`)
        : `<p class="pred-note"><span>${last.status === "skipped" ? "本次略過預判。" : "這次沒有回答預判。"}<br><small>實際結果：${fmtActual(last.kind, last.actual)}</small>${note}</span></p>`;
    } else {
      body.innerHTML = last.status === "answered"
        ? `<p class="pred-note"><span>你的預測 <span class="arr">${predType(last.kind).fmt(last.predicted)}</span></span><span>實際結果 <span class="arr">${predType(last.kind).fmt(last.actual)}</span></span><b>${last.match ? "一致" : "不一致"}</b></p>`
        : `<p class="pred-note">${last.status === "skipped" ? "本次略過預測。" : "這次沒有回答預測。"}</p>`;
    }
  } else {
    body.innerHTML = `<p class="pred-note" style="color:var(--ink-soft)">目前沒有預測題。</p>`;
  }
  // 教師模式：完整預測紀錄
  const STATUS = { answered: "已回答", skipped: "略過", unanswered: "未回答" };
  document.getElementById("pred-log").innerHTML = records.predictions.length
    ? records.predictions.map(r => `<li>第 <b>${r.no}</b> 次 RUN｜${STATUS[r.status]}${r.status === "answered" ? `｜預測 <b>${predType(r.kind).fmt(r.predicted)}</b>・實際 <b>${fmtActual(r.kind, r.actual)}</b>・${r.match ? "相同" : "不同"}` : `｜實際 <b>${fmtActual(r.kind, r.actual)}</b>`}${r.loopIncomplete ? "（迴圈未完整執行）" : ""}</li>`).join("")
    : `<li>還沒有預測紀錄（${LEVEL.predTrigger ? "程式符合本關條件時會出題" : "第 2、5、8…次 RUN 會出題"}）。</li>`;
  document.getElementById("pred-title").textContent = LEVEL.predInline ? "🧠 出航前預判" : LEVEL.predTrigger ? "出航前預判" : "小預測";
  // Level 2：預判出現時亮一下；第一次預判作答前 RUN 鎖住
  const qKey = p && p.answer === null && !running ? `${p.runNo}:${p.targetId}` : null;
  if (LEVEL.predInline && qKey && qKey !== lastPredGlow) {
    card.classList.remove("glow"); void card.offsetWidth; if (!reduceMotion) card.classList.add("glow");
    const r = card.getBoundingClientRect();
    if (document.getElementById("tour").hidden && (r.bottom > innerHeight || r.top < 0)) card.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }
  lastPredGlow = qKey;
  if (LEVEL.predLockFirst) document.getElementById("btn-run").disabled = !canRun();
  updateRunLock();
  // 學生模式只在有題目或剛出結果時顯示；教師模式一直顯示（含紀錄）
  card.hidden = !(p || justDone || isTeacherMode());
  document.getElementById("board").classList.toggle("picking", !!(p && predType().pickOnMap && p.answer === null && !running));
  perfMark("renderPrediction", perfT0);
}
// 1-4：預測題要在地圖上點一格作答
document.getElementById("board").addEventListener("click", e => {
  const c = e.target.closest(".cell");
  const p = currentPrediction();
  const picking = p && !running && predType().pickOnMap && p.answer === null;
  if (c && !picking && c.classList.contains("entangled")) {
    showHint("", "🪢 海廢纏住了", "塑膠袋纏在礁石上，需要先讓小船右側靠近它，再使用「解纏」。");
    return;
  }
  if (c && !picking && c.classList.contains("cluster")) {   // 點聚集格：小提示，不開大視窗
    const ws = state.bottles.filter(w => cellName(w[0], w[1]) === c.getAttribute("aria-label"));
    const cnt = {}; ws.forEach(w => { const l = wasteInfoOf(w).label; cnt[l] = (cnt[l] || 0) + 1; });
    showHint("", "海廢聚集", Object.entries(cnt).map(([l, n]) => `${l} ×${n}`).join("<br>") + `<br>合計：${ws.length} 個`);
    return;
  }
  if (!c || !picking) return;
  if (predType().needsDir) setPoseDraft("cell", c.getAttribute("aria-label"));
  else answerPrediction(c.getAttribute("aria-label"));
});
document.getElementById("pred-card").addEventListener("click", e => {
  const d = e.target.closest("[data-pdir]");
  if (d) { setPoseDraft("dir", d.dataset.pdir); return; }
  const b = e.target.closest("[data-pred]");
  if (!b) return;
  answerPrediction(b.dataset.pred === "change" ? null : b.dataset.pred);
});

function renderHistory() {
  const el = document.getElementById("history");
  document.getElementById("hist-n").textContent = records.runHistory.length;
  if (!records.runHistory.length) { el.innerHTML = `<p class="muted">還沒有 RUN 紀錄。排好程式按 RUN 試試看！</p>`; return; }
  const ICON = { ok: "✓", warn: "!", fatal: "✕", skipped: "–" };
  const RESULT = { ok: "成功", warn: "條件不成立", fatal: "重大錯誤", skipped: "未執行" };
  el.innerHTML = records.runHistory.map((run, idx) => {
    const issues = run.steps.filter(st => st.status === "warn").length;
    const head = `第 ${run.no} 次 RUN
      ${run.freePlay ? `<span class="tag">自由操作紀錄</span>` : ""}
      ${run.completed ? `<span class="tag">本次完成任務</span>` : ""}
      ${run.prediction ? `<span class="tag">${run.prediction.status === "answered" ? `預測 ${predType(run.prediction.kind).fmt(run.prediction.predicted)}／實際 ${fmtActual(run.prediction.kind, run.prediction.actual)}` : run.prediction.status === "skipped" ? "預測略過" : "預測未回答"}</span>` : ""}
      ${run.fatal ? `<span class="tag bad">重大錯誤停止</span>` : issues ? `<span class="tag bad">${issues} 個條件不成立</span>` : `<span class="tag">全部完成</span>`}`;
    const rows = run.steps.map(st => {
      let det = `<span>${RESULT[st.status]}</span>`;
      if (st.status !== "skipped") det += `・${DIR_LABEL[st.dir]}<span class="t-only">・位置 ${st.pos}</span>`;
      if (st.right) det += `<br>右側<span class="t-only"> ${st.right.cell}</span>：${st.right.content}・貨艙 ${st.cargo}`;
      if (st.reason && st.status !== "ok") det += `<br><span class="why">${st.reason}</span>`;
      return `<li class="${st.status}"><span class="ic" aria-hidden="true">${ICON[st.status]}</span><b>${st.n}. ${st.label}</b><span class="det">${det}</span></li>`;
    }).join("");
    return `<details ${idx === 0 ? "open" : ""}><summary>${head}</summary><ol>${rows}</ol></details>`;
  }).join("");
}
// ===== 換牌 =====
function toggleSwap() {
  if (running) return;
  if (!swapMode) {
    swapMode = true; swapSel = new Set(); program = [];
    invalidatePendingPrediction();   // 進入換牌會清空程式
    showHint("", "換牌", "點選 1～5 張要換掉的手牌，再按「確認換牌」。換牌後這回合不能 RUN。");
  } else {
    if (swapSel.size === 0) return;
    confirmSwap();
    return;
  }
  renderCards();
}
async function confirmSwap() {
  const ids = [...swapSel], n = ids.length;
  running = true; renderControls();
  await flyToDiscard(ids.map(id => document.querySelector(`#hand [data-id="${id}"]`)));
  const slots = discardCards(ids);
  renderPiles(); bump(document.getElementById("pile-discard"));
  swapMode = false; swapSel = new Set();
  clearSimCache();   // 換牌：新回合
  state.turns++; state.swapCount++;   // 確認換牌完成：1 回合、1 次換牌
  renderTurns();
  const added = await refillHandAnimated(slots);
  // Level 2：確認換牌 → 棄牌 → 補牌 → 回合結束 → 洋流更新（換牌回合不出預判）
  if (LEVEL.current) {
    showHint("", "🌊 洋流更新", `換掉 ${n} 張，已補滿 ${HAND_SIZE} 張。海廢正在受到洋流影響漂移…`);
    const swapNotes = (await applyCurrentUpdate()).notes;
    if (LEVEL.wind || LEVEL.weatherSeq) {
      const wr = await applyWindUpdate();
      swapNotes.push(...wr.notes);
    }
    showHint("ok", "本回合結束", `換掉 ${n} 張，已補滿 ${HAND_SIZE} 張。<br><small>${LEVEL.wind || LEVEL.weatherSeq ? "🌊 洋流與 💨 風已依序更新。" : "🌊 洋流已更新。"}</small>` + swapNotes.map(t => `<br><small>${t}</small>`).join(""));
    await sleep(TURN_END_HOLD);
    running = false;
  } else {
    running = false;
    showHint("ok", "換牌完成", `換掉 ${n} 張，已補滿 ${HAND_SIZE} 張。這回合結束，下回合再 RUN。`);
  }
  renderCards(added);
}
function cancelSwap() {
  swapMode = false; swapSel = new Set();
  showHint("", "提示", DEFAULT_HINT);
  renderCards();
}
function onHandClick(id) {
  if (running) return;
  if (swapMode) { swapSel.has(id) ? swapSel.delete(id) : swapSel.add(id); renderCards(); return; }
  addToProgram(id);
}

// ===== 卡牌畫面 =====
function renderPiles() {
  const d = cards.drawPile.length, x = cards.discardPile.length;
  document.getElementById("hand-n").textContent = `${cards.hand.length} 張`;
  document.getElementById("draw-n").textContent = d;
  document.getElementById("discard-n").textContent = x;
  const ds = document.getElementById("draw-stack");
  ds.innerHTML = "<i></i>".repeat(Math.min(3, d));
  ds.classList.toggle("empty", d === 0);
  const top = cards.discardPile[x - 1];
  document.getElementById("discard-stack").innerHTML = top
    ? `<span class="top"><svg viewBox="0 0 40 40"><use href="#${CARD_ICON[top.type]}"/></svg></span>` : "";
  document.getElementById("discard-last").textContent = `最近：${top ? ACTION_LABEL[top.type] : "—"}`;
}
function renderHand(added = []) {
  document.getElementById("hand").innerHTML = cards.hand.map(c => {
    const used = programCardIds().includes(c.id), sel = swapSel.has(c.id);
    const cls = "card" + (used && !swapMode ? " used" : "") + (sel ? " sel" : "") + (added.includes(c.id) ? " drawn" : "");
    const dis = running || (used && !swapMode) ? "disabled" : "";
    return `<button type="button" class="${cls}" data-id="${c.id}" ${dis}><svg viewBox="0 0 40 40"><use href="#${CARD_ICON[c.type]}"/></svg>${ACTION_LABEL[c.type]}</button>`;
  }).join("");
  renderPiles();
}
function renderProgram(marks = {}, reasons = {}, loopPass = {}) {
  if (openLoop && !program.includes(openLoop)) openLoop = null;
  const slots = Math.max(8, program.length);
  const circled = n => n <= 20 ? String.fromCharCode(0x245f + n) : String(n);
  const dis = running ? "disabled" : "";
  const arrow = dim => `<span class="seq-arrow${dim ? " dim" : ""}" aria-hidden="true">→</span>`;
  const slotHtml = (it, key, num) => {
    const m = marks[key] || "";
    const badge = m === "warn" ? `<span class="badge" aria-hidden="true">!</span>` : m === "failed" ? `<span class="badge" aria-hidden="true">✕</span>` : "";
    const r = reasons[key];
    const why = r ? `<span class="why">${r.length > 12 ? (m === "warn" ? "條件不成立" : r) : r}</span>` : "";
    const tip = r ? ` title="${r}"` : "";
    if (it.kind === "cmd")
      return `<button type="button" class="pslot filled cmdslot ${m}" data-path="${key}" data-cmdslot="1" ${dis}${tip}><span class="no">${num}</span>${badge}<svg viewBox="0 0 40 40"><use href="#${CMD_ICON[it.type]}"/></svg>${CMD_LABEL[it.type]}${why}</button>`;
    const c = findCard(it.id);
    return `<button type="button" class="pslot filled ${m}" data-path="${key}" data-cid="${it.id}" ${dis}${tip}><span class="no">${num}</span>${badge}<svg viewBox="0 0 40 40"><use href="#${CARD_ICON[c.type]}"/></svg>${ACTION_LABEL[c.type]}${why}</button>`;
  };
  let html = "";
  for (let i = 0; i < slots; i++) {
    const it = program[i];
    if (i > 0) html += arrow(!it);
    if (!it) { html += `<div class="pslot"><span class="no">${circled(i + 1)}</span></div>`; continue; }
    if (it.kind !== "loop") { html += slotHtml(it, String(i), circled(i + 1)); continue; }
    // 迴圈：紫色框＋左側標頭，被包住的卡排在框內
    const open = it === openLoop && !running;
    const m = marks[i] || "";
    const badge = m === "warn" ? `<span class="badge" aria-hidden="true">!</span>` : m === "failed" ? `<span class="badge" aria-hidden="true">✕</span>` : "";
    let inner = it.body.map((b, j) => (j ? arrow(false) : "") + slotHtml(b, `${i}.${j}`, `${circled(i + 1)}-${j + 1}`)).join("");
    if (open || !it.body.length) inner += (it.body.length ? arrow(true) : "") + `<div class="loop-hole">${open ? "點移動卡放進來" : "迴圈是空的"}</div>`;
    html += `<div class="loop-block ${m}${open ? " open" : ""}" role="group" aria-label="迴圈 ×${LOOP_TIMES}，裡面有 ${it.body.length} 張卡">
      <button type="button" class="loop-head ${m === "active" ? "active" : ""}" data-path="${i}" data-cid="${it.id}" ${dis} title="點一下可拿回整個迴圈"><span class="no">${circled(i + 1)}</span>${badge}<svg viewBox="0 0 40 40"><use href="#i-loop"/></svg>迴圈 ×${LOOP_TIMES}${loopPass[i] ? `<small>第 ${loopPass[i]} 次</small>` : ""}</button>
      <div class="loop-body">${inner}</div>
      ${open ? `<button type="button" class="loop-close" data-action="close-loop">結束迴圈</button>` : ""}
    </div>`;
  }
  const track = document.getElementById("program");
  track.innerHTML = html;
  if (!program.length) track.scrollLeft = 0;   // 清空後回到最前面
}
function renderControls(added = []) {
  const run = document.getElementById("btn-run"), swap = document.getElementById("btn-swap"), cancel = document.getElementById("btn-cancel");
  run.disabled = !canRun();
  updateRunLock();
  swap.disabled = running || (swapMode && swapSel.size === 0);
  swap.textContent = swapMode ? (swapSel.size ? `確認換牌 ${swapSel.size} 張（+1 回合）` : "確認換牌（+1 回合）") : "換牌｜消耗 1 回合";
  renderTurns();
  cancel.hidden = !swapMode;
  cancel.disabled = running;
  document.querySelectorAll(".testbar button").forEach(b => b.disabled = running);
  document.querySelectorAll("button.cmd").forEach(b => b.disabled = running || swapMode);
  renderHand(added);
}
/** 回合徽章：直接顯示 state.turns；數字變大時輕輕跳一下 */
let shownTurns = 0;
function renderTurns() {
  const n = state.turns;
  document.getElementById("turn-n").textContent = n;
  const badge = document.getElementById("turn-badge");
  if (n > shownTurns && !reduceMotion) {
    badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop");
  }
  shownTurns = n;
}
function renderCards(added = []) {
  renderProgram(); renderControls(added);
  if (LEVEL.predTrigger && !running) { renderPrediction(); renderBoard(); }   // 程式內容改變 → 重新判斷要不要出預判
}

document.getElementById("hand").addEventListener("click", e => { const b = e.target.closest("button.card"); if (b) onHandClick(Number(b.dataset.id)); });
document.getElementById("program").addEventListener("click", e => {
  if (e.target.closest('[data-action="close-loop"]')) { closeLoop(); return; }
  const b = e.target.closest("[data-path]");
  if (b) removeFromProgram(b.dataset.path);
});
document.getElementById("btn-run").addEventListener("click", runProgram);
document.getElementById("btn-continue").addEventListener("click", () => { if (continueResolver) continueResolver(); });
document.querySelectorAll("button.cmd").forEach(b => b.addEventListener("click", () => addCommandToProgram(b.dataset.cmd)));
document.getElementById("btn-swap").addEventListener("click", toggleSwap);
document.getElementById("btn-cancel").addEventListener("click", cancelSwap);

// ===== 開發測試工具（Debug，只在教師模式或 #dev 可用） =====
// 直接測試移動函式；不經過手牌／RUN，不寫入正式紀錄，也不做任務完成判定。
const moveForward  = ship => moveShip(ship, +1);
const moveBackward = ship => moveShip(ship, -1);
const turnLeft     = ship => turnShip(ship, "left");
const turnRight    = ship => turnShip(ship, "right");
const DEBUG_FN = { forward: moveForward, backward: moveBackward, turnLeft, turnRight };

if (location.hash === "#dev") document.body.dataset.dev = "1";
const devtools = document.getElementById("devtools");
function devtoolsAvailable() { return document.body.dataset.mode === "teacher" || document.body.dataset.dev === "1"; }

function debugMsg(text, isErr = false) {
  const el = document.getElementById("t-msg");
  el.textContent = text; el.classList.toggle("err", isErr);
}
/** 只移動沙盒裡的測試船；第一次使用時從正式船的位置複製一份 */
function debugAction(action) {
  if (running || !devtoolsAvailable()) return;
  if (debug.stopped) { debugMsg("測試已停止：剛才發生重大錯誤，請按「重設本關」。", true); return; }
  if (!debug.ship) debug.ship = { ...state.ship };
  const res = DEBUG_FN[action](debug.ship);
  if (!res.ok && res.fatal) {
    debug.stopped = true;
    debugMsg(`重大錯誤：${errorText(res).replace("這次測試停止。按「重設」再試一次。", "請按「重設本關」。")}`, true);
  } else if (!res.ok && res.blocked === "WASTE") {
    debugMsg(`條件不成立：${wasteBlockedText(action)}（測試船留在 ${cellName(debug.ship.x, debug.ship.y)}）`, true);
  } else {
    debug.ship = res.ship;
    debugMsg(`${ACTION_LABEL[action]} → 測試船在 ${cellName(debug.ship.x, debug.ship.y)}，${DIR_LABEL[debug.ship.dir]}。`);
  }
  renderBoard();
}
function clearDebugSandbox() {
  debug.ship = null; debug.stopped = false;
  debugMsg("");
  renderBoard();
}
function renderCargo() {
  const box = document.querySelector(".cargo");
  const cap = cargoCapacity();
  const currentSlots = box.querySelectorAll(".slotc").length;
  if (currentSlots !== cap) {
    const n = box.querySelector(".n");
    box.querySelectorAll(".slotc").forEach(el => el.remove());
    for (let i=0;i<cap;i++) { const sp=document.createElement("span"); sp.className="slotc"; sp.setAttribute("aria-label","空位"); box.insertBefore(sp,n); }
  }
  box.querySelectorAll(".slotc").forEach((el, i) => {
    const full = i < state.cargo.length;
    el.classList.toggle("full", full);
    const it = state.cargo[i];
    el.setAttribute("aria-label", full ? (it.label || WASTE_TYPES[it.kind].label) : "空位");
    el.innerHTML = full ? `<svg viewBox="0 0 40 40"><use href="#${it.icon || WASTE_TYPES[it.kind].icon}"/></svg>` : "";
  });
  box.querySelector(".n").textContent = `${state.cargo.length} / ${cap}`;
}
/** 重設本關：清掉測試船，並讓船、海廢、貨艙、任務進度回到正式初始狀態；手牌與牌堆不動 */
function resetLevel(msg) {
  if (running) return;
  debug.ship = null; debug.stopped = false; debugMsg("已重設本關。");
  Object.assign(state, createInitialState());
  clearSimCache();
  firstPickupTutorialDone = false;
  program = []; swapMode = false; swapSel = new Set();
  showHint(msg ? "ok" : "", "提示", msg || DEFAULT_HINT);
  renderBoard(); renderCargo(); renderCards();
  renderMissionStatus();
}
document.querySelectorAll(".testbar [data-act]").forEach(b => b.addEventListener("click", () => debugAction(b.dataset.act)));
document.getElementById("t-reset").addEventListener("click", () => resetLevel());
devtools.addEventListener("toggle", () => { if (!devtools.open) clearDebugSandbox(); });   // 收合時測試船消失
const KEYMAP = { ArrowUp: "forward", ArrowDown: "backward", ArrowLeft: "turnLeft", ArrowRight: "turnRight" };
document.addEventListener("keydown", e => {
  if (!devtoolsAvailable() || !devtools.open || !document.getElementById("tour").hidden || !document.getElementById("restart-dlg").hidden || !document.getElementById("settle-dlg").hidden) return;   // 學生模式或面板收合時，鍵盤完全不能動船
  if (e.target.closest("input, textarea, select")) return;
  if (KEYMAP[e.key]) { e.preventDefault(); debugAction(KEYMAP[e.key]); }
  else if (e.key === "r" || e.key === "R") resetLevel();
});

dealOpeningHand();
renderBoard();
renderCards();
renderPrediction();
renderHistory();
showHint("", "提示", DEFAULT_HINT);   // 開局：顯示第一個任務提示

// 沙灘：在 A、B 區正下方畫碼頭木棧
const shore = document.getElementById("shore");
/** 依目前關卡更新：碼頭木棧、圖例、任務文字、教師資訊、選單文字 */
function renderLevelTexts() {
  shore.innerHTML = [LEVEL.zoneA[0], LEVEL.zoneB[0]]
    .map(x => `<div class="pier" style="grid-column:${x+1}"><span></span></div>`).join("");
  const infos = levelWasteInfos(), keys = infos.map(i => i.key);
  const types = keys;
  document.getElementById("legend-bag").hidden = !keys.includes("bag");
  document.getElementById("legend-cup").hidden = !keys.includes("cup");
  document.getElementById("legend-plastic").hidden = !keys.includes("plastic:clean");
  document.getElementById("legend-plastic-dirty").hidden = !keys.includes("plastic:dirty");
  document.getElementById("legend-foam").hidden = !keys.includes("foam:clean");
  document.getElementById("legend-foam-oily").hidden = !keys.includes("foam:oily");
  const infoOf = k => infos.find(i => i.key === k);
  const legendZones = document.getElementById("legend-zones");
  if (legendZones) legendZones.textContent = `碼頭（${ZONE_LABEL.A}／${ZONE_LABEL.B}）`;
  const list = t => LEVEL.wastes.filter(w => wasteInfoOf(w).key === t).map(([x, y]) => cellName(x, y)).join("、");
  const cnt = t => LEVEL.wastes.filter(w => wasteInfoOf(w).key === t).length;
  const goal = LEVEL.goal
    ? `可回收海廢 ${LEVEL.goal.A} 個送到回收區＋一般垃圾 ${LEVEL.goal.B} 個送到垃圾區${LEVEL.requireLoop ? "＋至少成功使用 1 次迴圈" : ""}${LEVEL.requireUntangle ? "＋至少成功解纏 1 次" : ""}${LEVEL.requirePredictionMatch ? "＋至少成功預判 1 次" : ""}${LEVEL.requireFogPredictionMatch ? "＋至少成功霧天預判 1 次" : ""}（地圖可留下 ${LEVEL.wastes.length - LEVEL.goal.A - LEVEL.goal.B} 個；RUN 完整執行後才結算）`
    : LEVEL.goalTotal
    ? `正確卸載 ${LEVEL.goalTotal} 個海廢${LEVEL.goalKinds ? `（至少 ${Object.entries(LEVEL.goalKinds).map(([k, n]) => `${n} 個${WASTE_TYPES[k].label}`).join("、")}）` : ""}${LEVEL.requireLoop ? "＋至少成功使用 1 次迴圈" : ""}${LEVEL.requireUntangle ? "＋至少成功解纏 1 次" : ""}${LEVEL.requirePredictionMatch ? "＋至少成功預判 1 次" : ""}${LEVEL.requireFogPredictionMatch ? "＋至少成功霧天預判 1 次" : ""}（地圖可留下 ${LEVEL.wastes.length - LEVEL.goalTotal} 個；RUN 完整執行後才結算）`
    : types.map(t => `${cnt(t)} 個${infoOf(t).label}送到 ${ZONE_LABEL[infoOf(t).zone]}`).join("；");
  document.getElementById("mission-student").innerHTML = LEVEL.missionStudent;
  document.getElementById("mission-teacher").textContent =
    types.map(t => `將 ${list(t)} 的${infoOf(t).label}卸載到 ${LEVEL.zoneNames[infoOf(t).zone]}（${cellName(...LEVEL[infoOf(t).zone === "A" ? "zoneA" : "zoneB"])}）`).join("；") + "。"
    + (LEVEL.goal ? `只要 A 類 ${LEVEL.goal.A} 個＋B 類 ${LEVEL.goal.B} 個卸載完成${LEVEL.requireLoop ? "，並至少成功使用 1 次迴圈" : ""}${LEVEL.requireUntangle ? "，並至少成功解纏 1 次" : ""}即可過關。` : "")
    + (LEVEL.goalTotal ? `只要正確卸載 ${LEVEL.goalTotal} 個${LEVEL.goalKinds ? `（至少 ${Object.entries(LEVEL.goalKinds).map(([k, n]) => `${n} 個${WASTE_TYPES[k].label}`).join("、")}）` : ""}${LEVEL.requireLoop ? "，並至少成功使用 1 次迴圈" : ""}${LEVEL.requireUntangle ? "，並至少成功解纏 1 次" : ""}即可過關。` : "");
  const s = LEVEL.ship;
  document.getElementById("mission-info").innerHTML = [
    ...(LEVEL.coordsTodo ? [["座標狀態", "暫定配置（TODO：待設計者確認）"]] : []),
    ["船起點", `${cellName(s.x, s.y)}（x=${s.x}, y=${s.y}），${DIR_LABEL[s.dir]}`],
    ...types.map(t => [`${infoOf(t).label}（→ ${infoOf(t).zone}）`, list(t)]),
    ["礁石", LEVEL.reefs.map(([x, y]) => cellName(x, y)).join("、")],
    [LEVEL.zoneNames.A, cellName(...LEVEL.zoneA)],
    [LEVEL.zoneNames.B, cellName(...LEVEL.zoneB)],
    ["貨艙容量", String(cargoCapacity())],
    ["牌庫", Object.entries(LEVEL.deck || DECK_RECIPE).map(([k, n]) => `${ACTION_LABEL[k]}×${n}`).join("、") + `，共 ${Object.values(LEVEL.deck || DECK_RECIPE).reduce((a, b) => a + b, 0)} 張；${LEVEL.openingGuarantee === false ? "不做第一手保底" : "第一手保底"}`],
    ...(LEVEL.deck && LEVEL.deck.loop ? [["迴圈規則", `只能包前進／後退／左轉／右轉，不可放拾取、卸載或另一個迴圈；包住的序列重複 ${LOOP_TIMES} 次`]] : []),
    ...(LEVEL.current ? [["洋流", `${LEVEL.current.label}；每回合結束（RUN 或換牌）海上的海廢同步漂 1 格，超出邊界從另一側出現`],
      ["阻擋", "礁石、船、處理區、已滿的聚集 → 留在原格"], ["聚集上限", `${LEVEL.stackLimit || 2} 個（拾取時整個聚集一起撿）`]] : []),
    ...((LEVEL.wind || LEVEL.weatherSeq) ? [["風／天氣", "回合開始前顯示預報；回合結束固定先洋流、再風；霧只影響能見度，不改變實際位置規則"]] : []),
    [LEVEL.untangleTool ? "拾取／卸載／解纏" : "拾取／卸載", "右側相鄰格"],
    ["重大錯誤", "撞礁、超出地圖 → 立即停止"],
    ["預測題", predType().q],
    ["完成條件", `${goal}`],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  document.getElementById("cmd-pickup-sub").textContent = `拾取船右邊相鄰格的${LEVEL.wasteWord}`;
  document.getElementById("cmd-untangle").hidden = !LEVEL.untangleTool;
  document.getElementById("menu-restart-sub").textContent = `從 ${LEVEL.name} 第一步重新玩`;
  document.getElementById("level-select").value = LEVEL.id;
  const levelPill = document.getElementById("current-level-pill"); if (levelPill) levelPill.textContent = LEVEL.name;
  // Level 2：本關規則（第一次進入的簡短教學之後，仍可在任務區隨時打開）
  const rf = document.getElementById("rules-fold");
  rf.hidden = !LEVEL.rules; rf.open = false;
  document.getElementById("rules-list").innerHTML = (LEVEL.rules || []).map(r => `<li>${r}</li>`).join("");
  const rm = document.getElementById("rules-more");
  rm.hidden = !(LEVEL.rulesMore || []).length; rm.open = false;
  document.getElementById("rules-more-body").innerHTML = (LEVEL.rulesMore || []).map(([h, t]) => `<p><b>${h}</b><br>${t}</p>`).join("");
  document.getElementById("rules-full").innerHTML = (LEVEL.rulesFull || []).map(r => `<li>${r}</li>`).join("");
  // Level 2：藍綠配色、洋流資訊列、背景箭頭、預判卡移到 RUN 上方
  document.body.dataset.theme = LEVEL.theme || "";
  document.body.dataset.untangle = LEVEL.untangleTool ? "1" : "0";
  document.getElementById("current-banner").hidden = !LEVEL.current;
  if (LEVEL.current) renderEnvironmentBanner();
  const bd = document.getElementById("board");
  bd.classList.toggle("has-current", !!LEVEL.current);
  bd.dataset.flow = LEVEL.current ? LEVEL.current.dir : "";
  const card = document.getElementById("pred-card");
  if (LEVEL.predInline) { document.getElementById("pred-slot").appendChild(card); card.classList.add("inline"); }
  else { document.getElementById("pred-home").after(card); card.classList.remove("inline", "glow", "lock-glow"); }
  document.getElementById("run-lock").hidden = true;
}
renderLevelTexts();
applyLevelBackground();

function applyLevelBackground() {
  const board = document.querySelector("#game-screen .board");
  if (!board) return;

  if (LEVEL.background) {
    board.style.setProperty(
      "--level-bg",
      `url("${LEVEL.background}")`
    );
  } else {
    board.style.removeProperty("--level-bg");
  }
}

// ===== 正式功能：重新開始本關（學生／教師模式都能用；和開發工具的 Debug 重設分開） =====
/** 海廢分類情報（資料來自 WASTE_TYPES／wasteInfo／variantZones）：
 *  沒有狀態的種類直接列出；有狀態的種類（塑膠袋、保麗龍）只在本關有出現時才列，而且要再點開才看得到細項 */
function renderGuide() {
  const el = document.getElementById("guide"), body = document.getElementById("guide-body");
  el.hidden = !LEVEL.guide;
  if (!LEVEL.guide) { el.open = false; body.innerHTML = ""; return; }
  const zoneTag = z => `<span class="z ${z}">→ ${LEVEL.zoneNames[z]}</span>`;
  const row = (icon, label, z) => `<div class="guide-row"><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${icon}"/></svg><span>${label}</span>${zoneTag(z)}</div>`;
  const levelKinds = new Set(LEVEL.wastes.map(w => w[2]));
  const plain = ["bottle", "cup", "bag"].filter(k => WASTE_TYPES[k] && !WASTE_TYPES[k].variants)
    .map(k => { const i = wasteInfo(k); return row(i.icon, i.label, i.zone); });
  const withState = Object.keys(WASTE_TYPES).filter(k => WASTE_TYPES[k].variants && levelKinds.has(k)).map(k => {
    const t = WASTE_TYPES[k];
    const rows = Object.keys(t.variants).map(v => { const i = wasteInfo(k, v); return row(i.icon, i.label, i.zone); }).join("");
    return `<details class="guide-sub" id="guide-${k}"><summary><svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${t.icon}"/></svg><b>${t.label}</b><span class="ghint">${t.hint}</span></summary>${rows}</details>`;
  });
  body.innerHTML = plain.join("") + withState.join("");
  el.open = !!LEVEL.guide.open;   // 進入關卡／重新開始時回到預設狀態；學生自己收合後不會被強制打開
}
function restartLevel(msg) {
  if (running) return;                               // RUN 執行中不能中斷
  Object.assign(state, createInitialState());        // 船回起點、海廢、貨艙、任務進度、完成狀態
  clearSimCache();                                   // 重新開始／切換關卡：模擬暫存全部作廢
  firstPickupTutorialDone = false;                  // 第一個任務提示重新出現
  loopTutorialShown = false;                         // 1-4 第一次使用迴圈的提示可以再出現
  lv2.tips = { reef: false, cluster: false, clusterPickup: false, entangle: false, split: false }; lv2.tutorPos = 0; lastPredGlow = null;   // Level 2 一次性提示／教學預判重新開始
  highlightCell = null;
  program = []; swapMode = false; swapSel = new Set();
  dealOpeningHand();                                 // 牌庫重建洗牌、棄牌堆清空、第一手保底
  records.predictions = []; records.runHistory = []; records.runCount = 0; pendingPrediction = null;
  renderMissionStatus();
  renderGuide();
  renderPrediction(); renderHistory();
  showHint("ok", "重新開始", msg || `${LEVEL.name} 已重新開始，加油！`);
  renderBoard(); renderCargo(); renderCards();
}
const moreBtn = document.getElementById("more-btn"), moreMenu = document.getElementById("more-menu");
const restartDlg = document.getElementById("restart-dlg");
function setMenu(open) {
  moreMenu.hidden = !open;
  moreBtn.setAttribute("aria-expanded", String(open));
  if (open) { document.getElementById("menu-restart").disabled = running; document.getElementById("menu-tour").disabled = running; }
}
let pendingLevel = null;   // 切換關卡時借用同一個確認視窗
function openRestartDialog() {
  setMenu(false);
  if (running) return;
  pendingLevel = null;
  document.getElementById("restart-title").textContent = "重新開始本關";
  document.getElementById("restart-desc").textContent = `要重新開始 ${LEVEL.name} 嗎？目前的手牌、貨艙、地圖進度與本關紀錄都會重新開始。`;
  document.getElementById("restart-ok").textContent = "重新開始";
  restartDlg.hidden = false;
  document.getElementById("restart-cancel").focus();
}
function closeRestartDialog() {
  restartDlg.hidden = true;
  if (pendingLevel) { pendingLevel = null; document.getElementById("level-select").value = LEVEL.id; document.getElementById("level-select").focus(); }
  else moreBtn.focus();
}
/** 切換關卡：換關卡資料後，用正式的「重新開始本關」完整重置 */

function switchLevel(id) {
  if (!LEVELS[id]) return;

  if (!isLevelUnlocked(id)) {
    document.getElementById("level-select").value = LEVEL.id;
    showHint(
      "",
      "關卡尚未解鎖",
      `先完成 ${LEVELS[LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(id)-1)]].name}，就能繼續挑戰。`
    );
    return;
  }

  LEVEL = LEVELS[id];
  LEVEL = LEVELS[id];

clearDebugSandbox();
renderLevelTexts();
applyLevelBackground();
restartLevel(`已切換到 ${LEVEL.name}。`);

  if (LEVEL.intro && !lv2.introShown[LEVEL.id]) {
    lv2.introShown[LEVEL.id] = true;
    setTimeout(() => startTour(LEVEL.intro), 300);
  }
}
const levelSelect = document.getElementById("level-select");
levelSelect.addEventListener("change", () => {
  const id = levelSelect.value;
  if (running || id === LEVEL.id) { levelSelect.value = LEVEL.id; return; }
  if (records.runCount === 0 && program.length === 0) { switchLevel(id); return; }
  pendingLevel = id;
  document.getElementById("restart-title").textContent = "切換關卡";
  document.getElementById("restart-desc").textContent = `要切換到 ${LEVELS[id].name} 嗎？目前 ${LEVEL.name} 的手牌、貨艙、地圖進度與本關紀錄都會重新開始。`;
  document.getElementById("restart-ok").textContent = "切換";
  restartDlg.hidden = false;
  document.getElementById("restart-cancel").focus();
});
moreBtn.addEventListener("click", e => { e.stopPropagation(); setMenu(moreMenu.hidden); });
document.addEventListener("click", e => { if (!moreMenu.hidden && !e.target.closest(".more")) setMenu(false); });
document.getElementById("menu-restart").addEventListener("click", openRestartDialog);

// ===== 操作導覽（逐步聚焦；只是 UI 教學層，不抽牌、不動船、不改程式／預判／紀錄） =====
const TOUR_STEPS = [
  { sel: ".b-mission", title: "任務", text: "先看看這一關要完成什麼。<br>每一關都有不同的任務目標，完成指定條件就能過關。" },
  { sel: ".mapcard",   title: "海洋地圖", text: "這裡是海洋地圖。<br>地圖上會看到小船、海廢、礁石與處理區。<br>小船不能直接用滑鼠控制，只能透過指令行動。" },
  { sel: ".b-hand",    title: "手牌", text: "這些是移動指令卡。<br>點擊「前進、後退、左轉、右轉」等卡片，就能把指令加入下方的程式編排區。" },
  { sel: ".b-cmd",     title: "常駐指令", text: "拾取與卸載是隨時可以使用的常駐指令。<br>小船的右側是作業側。<br>拾取與卸載時，目標都必須位在船的右邊相鄰格。" },
  { sel: ".prog",      title: "程式編排區", text: "把指令排成你想執行的順序。<br>RUN 之後，系統會按照從左到右依序執行。<br>如果想修改，可以點已放入的卡片把它拿回。" },
  { sel: "#btn-run",   title: "RUN", text: "準備好了就按 RUN！<br>先想想小船會怎麼走，再看看實際執行結果。<br>如果結果和你想的不一樣，就調整程式再試一次。" },
];
let tourSteps = TOUR_STEPS;
let onboardingShown = false;   // 只記在這次開啟的網頁裡（不存 localStorage，共用電腦也不會影響下一位學生）
let tourIndex = -1;
const tourEl = document.getElementById("tour");
const tourOpen = () => !tourEl.hidden;
function startTour(steps) {
  if (running) return;
  tourSteps = Array.isArray(steps) ? steps : TOUR_STEPS;
  setMenu(false);
  tourEl.hidden = false;
  document.querySelector(".wrap").inert = true;   // 導覽期間暫時不能點到遊戲（狀態完全不動）
  showTourStep(0);
}
function endTour() {
  tourEl.hidden = true;
  tourIndex = -1;
  document.querySelector(".wrap").inert = false;
  window.removeEventListener("resize", placeTour);
  window.removeEventListener("scroll", placeTour, true);
}
function showTourStep(i) {
  tourIndex = i;
  const st = tourSteps[i], last = i === tourSteps.length - 1;
  document.getElementById("tour-step").textContent = `${i + 1} / ${tourSteps.length}`;
  document.getElementById("tour-title").textContent = st.title;
  document.getElementById("tour-text").innerHTML = st.text;
  document.getElementById("tour-prev").disabled = i === 0;
  document.getElementById("tour-next").textContent = last ? "開始任務" : "下一步";
  const target = document.querySelector(st.sel);
  // 依實際 DOM 位置聚焦（手機版順序不同也一樣），先捲到看得見的位置
  const r = target.getBoundingClientRect();
  if (r.top < 8 || r.bottom > innerHeight - 8) target.scrollIntoView({ block: r.height > innerHeight * .6 ? "start" : "center" });
  placeTour();
  window.addEventListener("resize", placeTour);
  window.addEventListener("scroll", placeTour, true);
  document.getElementById("tour-next").focus({ preventScroll: true });
}
/** 依目標區塊的實際位置放聚焦框與說明框；說明框一定留在螢幕內 */
function placeTour() {
  if (tourIndex < 0) return;
  const target = document.querySelector(tourSteps[tourIndex].sel);
  const r = target.getBoundingClientRect(), pad = 6, m = 12;
  const spot = document.getElementById("tour-spot"), pop = document.getElementById("tour-pop");
  Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = innerWidth, vh = innerHeight;
  let top, left;
  if (r.bottom + pad + m + ph <= vh) top = r.bottom + pad + m;                 // 放在下方
  else if (r.top - pad - m - ph >= 0) top = r.top - pad - m - ph;              // 放在上方
  else if (r.right + pad + m + pw <= vw) { left = r.right + pad + m; top = Math.max(m, Math.min(vh - ph - m, r.top)); }   // 放在右側
  else if (r.left - pad - m - pw >= 0) { left = r.left - pad - m - pw; top = Math.max(m, Math.min(vh - ph - m, r.top)); } // 放在左側
  else top = vh - ph - m;                                                       // 目標太大：貼在螢幕下緣
  if (left === undefined) left = r.left + r.width / 2 - pw / 2;
  left = Math.max(m, Math.min(vw - pw - m, left));
  top = Math.max(m, Math.min(vh - ph - m, top));
  pop.style.left = `${left}px`; pop.style.top = `${top}px`;
}
document.getElementById("tour-next").addEventListener("click", () => {
  if (tourIndex >= tourSteps.length - 1) endTour(); else showTourStep(tourIndex + 1);
});
document.getElementById("tour-prev").addEventListener("click", () => { if (tourIndex > 0) showTourStep(tourIndex - 1); });
document.getElementById("tour-skip").addEventListener("click", endTour);
document.getElementById("menu-tour").addEventListener("click", () => startTour());
document.addEventListener("keydown", e => {
  if (!tourOpen()) return;
  if (e.key === "Escape") { e.stopImmediatePropagation(); endTour(); }
}, true);
document.getElementById("restart-cancel").addEventListener("click", closeRestartDialog);
document.getElementById("restart-ok").addEventListener("click", () => {
  restartDlg.hidden = true;
  if (pendingLevel) { const id = pendingLevel; pendingLevel = null; switchLevel(id); return; }
  restartLevel(); moreBtn.focus();
});
restartDlg.addEventListener("click", e => { if (e.target === restartDlg) closeRestartDialog(); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!teacherDlg.hidden) closeTeacherDialog();
  else if (!restartDlg.hidden) closeRestartDialog();
  else if (!moreMenu.hidden) setMenu(false);
});


// ===== 首頁 / 關卡選擇 / 遊戲畫面 =====
const homeScreen = document.getElementById("home-screen");
const levelScreen = document.getElementById("level-screen");
const gameScreen = document.getElementById("game-screen");
function setMainScreen(name) {
  homeScreen.hidden = name !== "home";
  levelScreen.hidden = name !== "levels";
  gameScreen.hidden = name !== "game";
  if (name === "levels") renderLevelMap();
  window.scrollTo({ top: 0, behavior: "auto" });
}
function renderLevelMap() {
  const host = document.getElementById("level-map");
  if (!host) return;
  const groups = [
    { tier:1, title:"LEVEL 1", sub:"基礎任務", ids:LEVEL_ORDER.slice(0,5) },
    { tier:2, title:"LEVEL 2", sub:"洋流挑戰", ids:LEVEL_ORDER.slice(5,10) },
    { tier:3, title:"LEVEL 3", sub:"天氣任務", ids:LEVEL_ORDER.slice(10,15) },
  ];
  const tierIcon = {1:"⚓",2:"🌊",3:"💨"};
  const tierLabel = {1:"BASIC",2:"CURRENT",3:"WEATHER"};
  host.innerHTML = groups.map(g => `<section class="level-group" data-tier="${g.tier}">
    <h2 class="level-group-title">${g.title}<small>${g.sub}</small></h2>
    <div class="level-grid">${g.ids.map(id => {
      const unlocked = isLevelUnlocked(id), completed = completedLevelIds.has(id), current = LEVEL.id === id;
      return `<button type="button" class="level-node ${unlocked ? "unlocked" : "locked"} ${completed ? "completed" : ""} ${current ? "current" : ""}" data-level="${id}" data-tier="${g.tier}" ${unlocked ? "" : "disabled"} aria-label="${LEVELS[id].name}${completed ? "，已完成" : unlocked ? "，已解鎖" : "，未解鎖"}"><span class="mission-icon" aria-hidden="true">${tierIcon[g.tier]}</span><span class="num">${id}</span><span class="node-label">${tierLabel[g.tier]}</span><span class="status" aria-hidden="true"></span></button>`;
    }).join("")}</div>
  </section>`).join("");
}
function enterSelectedLevel(id) {
  if (!isLevelUnlocked(id) || running) return;
  if (id !== LEVEL.id) switchLevel(id);
  setMainScreen("game");
  if (LEVEL.id === "1-1" && !onboardingShown) {
    onboardingShown = true;
    setTimeout(() => startTour(), 350);
  }
}
document.getElementById("home-start").addEventListener("click", () => setMainScreen("levels"));
document.getElementById("level-home").addEventListener("click", () => setMainScreen("home"));
document.getElementById("level-map").addEventListener("click", e => {
  const b = e.target.closest("[data-level]"); if (b && !b.disabled) enterSelectedLevel(b.dataset.level);
});
document.getElementById("menu-levels").addEventListener("click", () => { if (!running) { setMenu(false); setMainScreen("levels"); } });
document.getElementById("settle-levels").addEventListener("click", () => { settleDlg.hidden = true; setMainScreen("levels"); });
document.getElementById("home-how").addEventListener("click", () => {
  if (LEVEL.id !== "1-1") switchLevel("1-1");
  setMainScreen("game");
  onboardingShown = true;
  setTimeout(() => startTour(), 250);
});

// ===== 教師入口：學生畫面不顯示模式切換；教師碼只在這次頁面工作階段有效 =====
// 注意：這是前端防誤觸，不是真正安全的帳號驗證。正式部署若需要安全權限，應改用 GAS 後端驗證。
const TEACHER_CODE = "SEA2026";
const teacherDlg = document.getElementById("teacher-dlg");
const teacherCodeInput = document.getElementById("teacher-code");
function updateTeacherMenu() {
  const active = isTeacherMode();
  document.getElementById("menu-teacher").childNodes[0].nodeValue = active ? "離開教師模式" : "教師入口";
  document.getElementById("menu-teacher-sub").textContent = active ? "回到學生循序解鎖模式" : "輸入教師碼以開啟完整關卡";
}
function enterTeacherMode() {
  document.body.dataset.mode = "teacher";
  refreshLevelOptions();
  updateTeacherMenu();
  renderLevelMap();
  renderPrediction();
  showHint("ok", "教師模式已開啟", "所有關卡與教師資訊已開放；重新整理頁面後會自動回到學生模式。");
}
function leaveTeacherMode() {
  document.body.dataset.mode = "student";
  if (document.body.dataset.dev !== "1") { devtools.open = false; clearDebugSandbox(); }
  const target = unlockedLevelIds.has(LEVEL.id) ? LEVEL.id : highestUnlockedLevel();
  refreshLevelOptions();
  updateTeacherMenu();
  renderLevelMap();
  if (target !== LEVEL.id) switchLevel(target);
  else renderPrediction();
  showHint("", "已回到學生模式", "學生只能依序挑戰已解鎖的關卡。");
}
function openTeacherDialog() {
  setMenu(false);
  if (isTeacherMode()) { leaveTeacherMode(); return; }
  teacherCodeInput.value = "";
  document.getElementById("teacher-error").hidden = true;
  teacherDlg.hidden = false;
  setTimeout(() => teacherCodeInput.focus(), 0);
}
function closeTeacherDialog() { teacherDlg.hidden = true; teacherCodeInput.value = ""; moreBtn.focus(); }
document.getElementById("menu-teacher").addEventListener("click", openTeacherDialog);
document.getElementById("home-teacher").addEventListener("click", openTeacherDialog);
document.getElementById("level-teacher").addEventListener("click", openTeacherDialog);
document.getElementById("teacher-cancel").addEventListener("click", closeTeacherDialog);
document.getElementById("teacher-ok").addEventListener("click", () => {
  if (teacherCodeInput.value === TEACHER_CODE) { teacherDlg.hidden = true; teacherCodeInput.value = ""; enterTeacherMode(); }
  else { document.getElementById("teacher-error").hidden = false; teacherCodeInput.select(); }
});
teacherCodeInput.addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("teacher-ok").click(); });
teacherDlg.addEventListener("click", e => { if (e.target === teacherDlg) closeTeacherDialog(); });

refreshLevelOptions();
updateTeacherMenu();

// 首次開啟先停在 SEA SAVER 主畫面；進入 1-1 時才播放操作導覽。
renderLevelMap();
setMainScreen("home");

