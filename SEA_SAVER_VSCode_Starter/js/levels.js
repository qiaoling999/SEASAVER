const LEVELS = {
  "1-1": {
    id: "1-1", name: "Level 1-1",
    background: "assets/map/level1-1.png",
    // 地圖採「玩家在下方」視角：船從下方出發、船頭朝上，A/B 港口在上方（整張地圖 180° 對稱旋轉）
    ship: { x: 5, y: 8, dir: "up" },                                          // E8 朝上
    wastes: [[5,6,"bottle"],[6,4,"bottle"],[3,3,"bottle"]],                   // 寶特瓶 E6、F4、C3
    reefs:  [[4,6],[7,5],[4,4]],                                              // D6、G5、D4
    zoneA: [7,1], zoneB: [2,1],                                               // A 區 G1、B 區 B1
    zoneNames: { A: "回收區", B: "垃圾區" },
    wasteWord: "寶特瓶",
    tutorial: true,
    prediction: "direction",
    missionStudent: "幫小船把 <b>3 個寶特瓶</b> 全部送到 <b>回收區</b>！小心不要撞到礁石。",
    completeText: "3 個寶特瓶都送到回收區了！",
  },
  "1-2": {
    id: "1-2", name: "Level 1-2",
    ship: { x: 5, y: 8, dir: "up" },                                          // E8 朝上
    wastes: [[6,6,"bottle"],[3,3,"bottle"],[3,6,"bag"],[6,4,"bag"]],          // 寶特瓶 F6、C3；食品包裝袋 C6、F4
    reefs:  [[4,6],[5,4],[6,2]],                                              // D6、E4、F2
    zoneA: [7,1], zoneB: [2,1],                                               // A 區 G1、B 區 B1
    zoneNames: { A: "回收區", B: "垃圾區" },
    wasteWord: "海廢",
    tutorial: false,
    prediction: "firstZone",
    predTrigger: "hasUnload",      // 程式裡有至少 1 個卸載才出題
    missionStudent: "把 <b>2 個寶特瓶</b>送到 <b>回收區</b>，<b>2 個食品包裝袋</b>送到 <b>垃圾區</b>！小心礁石。",
completeText: "4 個海廢都分類正確，送到回收區和垃圾區了！",
  },
  "1-3": {
    id: "1-3", name: "Level 1-3",
    ship: { x: 5, y: 8, dir: "up" },                                                      // E8 朝上
    wastes: [[6,6,"bottle"],[4,3,"bottle"],[7,3,"cup"],[3,6,"bag"],[5,5,"bag"]],           // 寶特瓶 F6、D3；紙飲料杯 G3；食品包裝袋 C6、E5
    reefs:  [[3,7],[6,4],[4,2]],                                                          // C7、F4、D2
    zoneA: [7,1], zoneB: [2,1],                                                           // A 區 G1、B 區 B1
    zoneNames: { A: "回收區", B: "垃圾區" },
    wasteWord: "海廢",
    tutorial: false,
    prediction: "firstFull",
    predTrigger: "twoPickups",     // 程式裡有至少 2 次拾取才出題
    goal: { A: 2, B: 2 },          // 完成條件：A 類卸 2 個＋B 類卸 2 個即可，地圖可留下 1 個
    missionStudent: "挑戰任務！至少把 <b>2 個可回收海廢</b>送到 <b>回收區</b>，再把 <b>2 個一般垃圾</b>送到 <b>垃圾區</b>。不需要把海面全部清空！",

completeText: "2 個可回收海廢、2 個一般垃圾都分類正確送到了！",
  },
  "1-4": {
    id: "1-4", name: "Level 1-4",
    ship: { x: 7, y: 8, dir: "up" },                                                      // G8 朝上
    wastes: [[3,6,"bottle"],[6,3,"cup"],[2,4,"bag"],[4,2,"bag"],
             [7,4,"plastic","clean"],[1,6,"plastic","dirty"]],                             // 寶特瓶 C6；紙飲料杯 F3；食品包裝袋 B4、D2；乾淨塑膠袋 G4；髒污塑膠袋 A6
    variantZones: { "plastic:clean": "A", "plastic:dirty": "B" },                         // 塑膠袋：乾淨 → A、髒污 → B
    reefs:  [[6,6],[5,5],[3,3]],                                                          // F6、E5、C3
    zoneA: [7,1], zoneB: [2,1],                                                           // A 區 G1、B 區 B1
    zoneNames: { A: "回收區", B: "垃圾區" },
    wasteWord: "海廢",
    tutorial: false,
    prediction: "loopEnd",
    predTrigger: "hasLoop",        // 程式裡有至少 1 個迴圈才出題
    deck: { forward: 8, backward: 4, turnLeft: 5, turnRight: 5, loop: 3 },               // 共 25 張
    openingGuarantee: false,                                                              // 1-4 不做第一手保底
    goalTotal: 4,              // 正確卸載 4 個即可（地圖可留下 2 個）
    requireLoop: true,         // 而且至少成功使用 1 次迴圈
    guide: { open: true },     // 海廢分類情報：進入本關預設展開
    loopTutorial: true,        // 第一次點「迴圈 ×2」時顯示一次性操作提示
    missionStudent: "正確處理 <b>4 個海廢</b>，並至少<b>成功使用 1 次迴圈</b>。<br><small>本關出現乾淨與髒污的塑膠袋，請利用「海廢分類情報」判斷應送往哪一區。</small>",
    completeText: "正確卸載 4 個海廢，而且成功使用了迴圈！",
  },
  "1-5": {
    id: "1-5", name: "Level 1-5",
    ship: { x: 2, y: 8, dir: "up" },                                                      // B8 朝上
    wastes: [[5,7,"bottle"],[7,5,"cup"],[4,4,"bag"],[1,3,"bag"],
             [6,4,"plastic","clean"],[2,3,"plastic","dirty"],
             [5,2,"foam","oily"]],                                                         // 寶特瓶 E7；紙飲料杯 G5；食品包裝袋 D4、A3；乾淨塑膠袋 F4；髒污塑膠袋 B3；沾油保麗龍 E2
    variantZones: { "plastic:clean": "A", "plastic:dirty": "B", "foam:clean": "A", "foam:oily": "B" },
    reefs:  [[2,6],[3,5],[6,3],[3,2]],                                                    // B6、C5、F3、C2
    zoneA: [7,1], zoneB: [2,1],                                                           // A 區 G1、B 區 B1
    zoneNames: { A: "回收區", B: "垃圾區" },
    wasteWord: "海廢",
    tutorial: false,
    prediction: "endPose",
    predTrigger: "loopAndThreeMoves",   // 有迴圈，且移動／轉向卡共至少 3 張（迴圈內的卡算實際放入的張數）
    deck: { forward: 8, backward: 4, turnLeft: 5, turnRight: 5, loop: 3 },               // 共 25 張（同 1-4）
    openingGuarantee: false,
    goal: { A: 2, B: 2 },      // A 類 2 個＋B 類 2 個（不用清空 7 個）
    requireLoop: true,         // 而且至少成功使用 1 次迴圈
    guide: { open: false },    // 海廢分類情報：預設收合
    missionStudent: "綜合挑戰！正確處理 <b>2 個可回收海廢</b>、<b>2 個一般垃圾</b>，並至少<b>成功使用 1 次迴圈</b>。<br><small>本關出現不同狀態的塑膠袋與保麗龍，請利用「海廢分類情報」完成判斷。</small>",
completeText: "2 個可回收海廢、2 個一般垃圾都分類正確，而且成功使用了迴圈！",
  },
  // ===== Level 2：洋流 =====
  "2-1": {
    id: "2-1", name: "Level 2-1",
    theme: "current",                                                                    // 藍綠「流動洋流」配色（只影響 Level 2）
    ship: { x: 4, y: 8, dir: "up" },                                                      // D8 朝上
    wastes: [[5,4,"bottle"],[2,5,"bottle"],[8,6,"bottle"],[3,4,"cup"],[4,2,"cup"]],        // 寶特瓶 E4、B5、H6；紙飲料杯 C4、D2
    reefs:  [[3,3],[6,4],[7,5],[5,6]],                                                    // C3、F4（教學：擋住 E4 寶特瓶）、G5、E6
    zoneA: [7,1], zoneB: [2,1],                                                           // A 區 G1、B 區 B1（本關主要用 A 區，B 區仍保留）
    zoneNames: { A: "回收區", B: "垃圾區" },
    wasteWord: "海廢",
    tutorial: false,
    current: { dir: "right", label: "→ 往右（東）" },   // 每回合結束，海上的海廢同步漂 1 格；超出邊界從另一側出現
    stackLimit: 2,                                       // 同一格最多 2 個海廢（聚集）
    prediction: "wasteAfter",
    predTrigger: "currentEvent",
    predInline: true,          // 預判卡放在程式編排區下方、RUN 上方
    predLockFirst: true,       // 第一次預判要作答或略過，RUN 才解鎖
    // 前三次教學型預判（waste = wastes 的索引）：H6 寶特瓶跨邊界 → E4 寶特瓶被 F4 擋住 → C4 紙杯
    tutorialPredictions: [{ waste: 2, event: "wrap" }, { waste: 0, event: "block" }, { waste: 3, event: "cluster" }],
    // 學生版「🌊 本關小提醒」：4 條短版；「查看更多規則」裡再補 2 條
    rules: [
      "每回合結束，海廢會往箭頭方向漂 1 格。",
      "漂到地圖邊緣，會從另一側再出現。",
      "遇到礁石、小船或處理區，海廢會停下來。",
      "同一格最多聚集 2 個海廢，拾取時會一起撿。",
    ],
    rulesMore: [
      ["📦 聚集拾取", "如果貨艙空間不夠，整個聚集都不能拾取。"],
      ["🔄 迴圈 ×2", "把移動卡放進迴圈裡，裡面的動作會重複 2 次。"],
    ],
    // 教師模式：原本的完整規則說明
    rulesFull: [
      "🌊 <b>洋流每回合更新</b>：每回合結束（RUN 或換牌）後，海上的海廢都會往洋流方向（→ 往右）漂 1 格，而且是同時一起移動。",
      "🔁 <b>邊界循環</b>：海廢漂到地圖邊緣時，會從另一側再出現（例如 H6 → A6）。",
      "🪨 <b>阻擋</b>：前方是礁石、小船、處理區，或已經滿的聚集時，海廢會留在原格。",
      "🫧 <b>聚集上限 2</b>：兩個海廢漂進同一格會形成聚集，一格最多 2 個，之後會一起漂移。",
      "📦 <b>聚集整團拾取</b>：一次「拾取」會把整個聚集一起撿進貨艙；貨艙空間不夠時，這次拾取不成立。",
      "🔄 <b>迴圈 ×2</b>：點【迴圈 ×2】→ 放入移動卡 → 點【結束迴圈】，裡面的移動會重複執行 2 次。",
    ],
    intro: [{ sel: ".mapcard", title: "洋流初體驗", text: "1. 每回合結束後，海廢會受到洋流影響，漂移 1 格。<br>2. 本關洋流方向：<b>→ 往右（東）</b>。<br>3. 海廢漂到地圖邊緣時，會從另一側重新出現。可以把這張海圖想成一個持續循環的海流區域。" }],
    deck: { forward: 8, backward: 4, turnLeft: 5, turnRight: 5, loop: 3 },               // 共 25 張（同 1-4／1-5）
    openingGuarantee: false,
    goalTotal: 4,                        // 正確處理 4 個
    goalKinds: { bottle: 1, cup: 1 },    // 其中至少 1 個寶特瓶、1 個紙飲料杯
    missionStudent: "正確處理 <b>4 個海廢</b>，且其中至少包含 <b>1 個寶特瓶</b>與 <b>1 個紙飲料杯</b>。<br><small>每回合結束後，海廢會被洋流推動。不需要把 5 個全部撿完。</small>",
    completeText: "正確處理了 4 個海廢，洋流也難不倒你！",
  },
  "2-2": {
    id: "2-2", name: "Level 2-2", theme: "current",
    ship: { x: 4, y: 8, dir: "up" },
    wastes: [[5,4,"plastic","clean"],[1,6,"plastic","clean"],[2,5,"bottle"],[8,6,"bottle"],[3,4,"cup"],[4,2,"cup"]],
    reefs: [[3,3],[6,4],[7,5],[5,6],[8,3]], zoneA:[7,1], zoneB:[2,1],
    zoneNames:{A:"A 回收區",B:"B 垃圾區"}, wasteWord:"海廢", tutorial:false,
    current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:3,
    allowEntangle:true, untangleTool:true, requireUntangle:true,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, predLockFirst:true,
    tutorialPredictions:[{waste:0,event:"entangle"},{waste:3,event:"wrap"},{waste:4,event:"cluster"}],
    rules:["每回合結束，海廢會往箭頭方向漂 1 格。","塑膠袋碰到礁石可能會纏住，要先解纏才能拾取。","同一格最多聚集 2 個海廢。","解纏、拾取與卸載都從小船右側作業。"],
    rulesMore:[["🪢 解纏","塑膠袋纏在礁石上時，先用「解纏」，再用「拾取」。"],["🔄 迴圈 ×2","把移動卡放進迴圈裡，裡面的動作會重複 2 次。"]],
    rulesFull:["🌊 每回合結束（RUN 或換牌）後，海廢同步往右漂 1 格。","🪢 單獨的塑膠袋碰到礁石會移到礁石格並纏住，纏住後不再漂移。","🧰 解纏是常駐指令，只能處理船右側相鄰格被纏住的塑膠袋；解纏後仍留在原格。","📦 被纏住的塑膠袋不能直接拾取；貨艙容量為 3。"],
    intro:[{sel:".mapcard",title:"新狀況：海廢纏繞",text:"塑膠袋碰到礁石可能會纏住。<br><b>先解纏，再拾取。</b><br>解纏工具和拾取一樣，要從小船右側相鄰格使用。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:5, goalKinds:{plastic:1},
    missionStudent:"正確處理 <b>5 個海廢</b>，至少包含 <b>1 個塑膠袋</b>，並成功<b>解纏 1 次</b>。",
    completeText:"成功解開纏住的海廢，也完成了本關任務！",
  },
  "2-3": {
    id:"2-3", name:"Level 2-3", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[5,4,"bottle"],[4,4,"plastic","clean"],[2,5,"bottle"],[8,6,"bottle"],[3,2,"cup"],[1,6,"plastic","clean"],[4,2,"cup"]],
    reefs:[[3,3],[6,4],[7,5],[5,6]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    allowEntangle:true, allowSplitEntangle:true, untangleTool:true, requireUntangle:true,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, predLockFirst:true,
    rules:["洋流、聚集與纏繞規則都會一起出現。","含塑膠袋的聚集撞上礁石時，可能會拆開。","塑膠袋纏住後要先解纏才能拾取。","同一格仍然最多聚集 2 個海廢。"],
    rulesMore:[["🫧 聚集拆分","聚集撞向礁石時，塑膠袋會纏在礁石上，另一個普通海廢留在原格。"],["🧠 先預判","RUN 前先想像程式執行與洋流更新後，各個海廢會去哪裡。"]],
    rulesFull:["含塑膠袋的 2 個海廢聚集撞上礁石：塑膠袋進入礁石格並纏住；其他海廢留在原格。","不含塑膠袋的聚集遇礁石仍整團被擋住。","解纏後塑膠袋留在礁石格，若本回合沒有拾取，回合結束會再次受到洋流影響。"],
    intro:[{sel:".mapcard",title:"聚集也可能拆開",text:"這關會把「聚集」和「纏繞」放在一起。<br>如果聚集裡有塑膠袋，撞上礁石時要仔細觀察結果。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:5, goalKinds:{plastic:1}, missionStudent:"正確處理 <b>5 個海廢</b>，至少包含 <b>1 個塑膠袋</b>，並成功<b>解纏 1 次</b>。",
    completeText:"你成功處理了聚集、拆分與纏繞！",
  },
  "2-4": {
    id:"2-4", name:"Level 2-4", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[2,4,"plastic","clean"],[6,6,"plastic","clean"],[1,5,"bottle"],[4,5,"bottle"],[8,3,"bottle"],[3,3,"cup"],[5,7,"cup"]],
    reefs:[[4,3],[7,4],[3,6],[7,6],[5,2]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    allowEntangle:true, allowSplitEntangle:true, untangleTool:true, requireUntangle:true,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true,
    rules:["這關沒有新工具，重點是安排處理順序。","有些海廢會逐漸聚集，有些塑膠袋可能纏礁。","換牌也會讓洋流更新 1 次。","先觀察，再決定要先處理哪一個目標。"],
    rulesMore:[["🧭 路徑規劃","不一定要追最近的海廢；有時先處理即將纏住或聚集的目標更有效率。"],["📦 貨艙","貨艙有 4 格，可以規劃一次帶回多個海廢。"]],
    rulesFull:["延續 2-1～2-3 全部洋流、聚集、纏繞、解纏與拆分規則。","本關不新增規則，以路徑與先後順序為主要挑戰。"],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:6, goalKinds:{plastic:1}, missionStudent:"正確處理 <b>6 個海廢</b>，至少包含 <b>1 個塑膠袋</b>，並成功<b>解纏 1 次</b>。<br><small>試試看能不能用更少回合完成。</small>",
    completeText:"你成功安排了處理順序，完成路徑規劃挑戰！",
  },
  "2-5": {
    id:"2-5", name:"Level 2-5", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[3,4,"plastic","clean"],[6,6,"plastic","clean"],[8,3,"bottle"],[2,5,"bottle"],[5,5,"bottle"],[1,3,"cup"],[4,6,"cup"],[7,7,"cup"]],
    reefs:[[4,3],[7,4],[3,6],[7,6],[5,2],[8,5]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    allowEntangle:true, allowSplitEntangle:true, untangleTool:true, requireUntangle:true,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true,
    rules:["這是 Level 2 綜合任務。","跨邊界、聚集、纏繞與拆分可能同時出現。","換牌與 RUN 都會讓洋流更新。","先預判環境變化，再安排你的程式。"],
    rulesMore:[["🏁 綜合挑戰","不需要清空全部海廢；選擇更有效率的處理順序。"],["🧰 解纏","被纏住的塑膠袋仍要先解纏，才能拾取。"]],
    rulesFull:["延續 Level 2 所有規則，不新增新機制。","本關以多事件同時發生與策略規劃作為最終挑戰。"],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:7, goalKinds:{plastic:2}, missionStudent:"Level 2 最終任務！正確處理 <b>7 個海廢</b>，其中至少包含 <b>2 個塑膠袋</b>，並成功<b>解纏 1 次</b>。",
    completeText:"Level 2 完成！你已經能綜合判斷洋流、聚集與纏繞。",
  },

  // ===== Level 3：風與能見度 =====
  "3-1": {
    id:"3-1", name:"Level 3-1", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[5,5,"bottle"],[2,5,"bottle"],[7,6,"bottle"],[3,4,"cup"],[6,3,"cup"],[1,7,"plastic","clean"]],
    reefs:[[3,3],[6,5],[8,4],[5,2]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, predLockFirst:true, requirePredictionMatch:true,
    tutorialPredictions:[{waste:0,event:"wind"}],
    rules:["回合結束時，海廢會先受洋流影響，再受到風影響。","本關風向固定往上，弱風會再推動 1 格。","小船不受風吹動，只靠指令移動。","RUN 前先看環境資訊再預判。"],
    rulesMore:[["💨 風的順序","先洋流，再風；兩段會分開顯示。"],["🧠 預判","想一想兩段環境影響後，預判目標最後會在哪一格。"]],
    rulesFull:["洋流更新完成後，再依風向移動海上的海廢。","Level 3-1 固定弱風：往上 1 格；船不受風影響。"],
    intro:[{sel:".mapcard",title:"新環境：風",text:"回合結束時，海廢會<b>先受到洋流</b>，再受到<b>風</b>影響。<br>本關是向上的弱風（1 格），小船不會被風吹動。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:5, missionStudent:"正確處理 <b>5 個海廢</b>，並至少成功完成 <b>1 次受到風影響的預判</b>。",
    completeText:"你已經能同時判斷洋流與風向了！",
  },
  "3-2": {
    id:"3-2", name:"Level 3-2", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[4,5,"bottle"],[1,6,"bottle"],[7,5,"bottle"],[3,3,"cup"],[6,6,"cup"],[8,2,"plastic","clean"],[2,4,"cup"]],
    reefs:[[5,3],[7,4],[3,6],[6,2]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    weatherSeq:[
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:false},
      {wind:{dir:"up",strength:2,label:"↑ 往上・強風（2 格）"},fog:false},
    ],
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, predLockFirst:true, requirePredictionMatch:true,
    tutorialPredictions:[{waste:0,event:"wind"}],
    rules:["每回合開始前都能看到風力預報。","弱風推 1 格，強風推 2 格。","強風會逐格移動，不會直接跳過障礙。","小船仍然不受風影響。"],
    rulesMore:[["📣 環境預報","風力會依固定順序變化，不是隨機。"],["💨 強風","強風會分兩次各移動 1 格，每一步都會判斷阻擋。"]],
    rulesFull:["本關風力固定依「弱風→強風」循環。","每次回合結束仍是先洋流，再依本回合預報執行 1 或 2 格的風移動。"],
    intro:[{sel:".current-banner",title:"風力也會改變",text:"弱風會推 <b>1 格</b>，強風會推 <b>2 格</b>。<br>先看本回合預報，再安排你的程式。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:5, missionStudent:"正確處理 <b>5 個海廢</b>，並至少成功完成 <b>1 次風力預判</b>。",
    completeText:"你已經能把風力大小也算進規劃裡！",
  },
  "3-3": {
    id:"3-3", name:"Level 3-3", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[5,5,"bottle"],[2,4,"bottle"],[8,6,"bottle"],[3,3,"cup"],[6,6,"cup"],[1,7,"plastic","clean"],[7,3,"cup"]],
    reefs:[[4,3],[6,4],[3,6],[8,5]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    weatherSeq:[
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:false},
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:true},
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:false},
    ],
    fogHideCount:2,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, predLockFirst:true, requireFogPredictionMatch:true,
    tutorialPredictions:[{waste:0,event:"wind"}],
    rules:["有霧時，部分海廢會暫時看不見。","礁石、小船與處理區仍然看得到。","洋流與風仍照預報正常發生。","利用前一回合觀察來推理位置。"],
    rulesMore:[["🌫️ 霧","看不見不代表消失；霧散後會在新的位置重新出現。"],["🧠 霧中預判","霧天也可以預判，試著根據規則推理。"]],
    rulesFull:["本關固定循環「晴→霧→晴」。","霧天隱藏部分海廢圖示，但實際位置與環境移動照常計算。"],
    intro:[{sel:".mapcard",title:"霧來了",text:"有霧時，部分海廢會暫時看不見，但它們沒有消失。<br>洋流與風仍然照常影響它們。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:5, missionStudent:"正確處理 <b>5 個海廢</b>，並至少成功完成 <b>1 次霧天的預判</b>。",
    completeText:"即使視野變差，你也能根據規則推理位置！",
  },
  "3-4": {
    id:"3-4", name:"Level 3-4", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[3,4,"plastic","clean"],[6,6,"plastic","clean"],[8,3,"bottle"],[2,5,"bottle"],[5,5,"bottle"],[1,3,"cup"],[4,6,"cup"],[7,7,"cup"]],
    reefs:[[4,3],[7,4],[3,6],[7,6],[5,2],[8,5]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    allowEntangle:true, allowSplitEntangle:true, untangleTool:true, requireUntangle:true,
    weatherSeq:[
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:false},
      {wind:{dir:"left",strength:2,label:"← 往左・強風（2 格）"},fog:false},
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:true},
    ], fogHideCount:2,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, requirePredictionMatch:true,
    rules:["洋流、風、霧、聚集與纏繞都可能一起出現。","先看環境預報，再決定 RUN 或換牌。","被纏住的塑膠袋仍要先解纏。","這關沒有新的工具。"],
    rulesMore:[["📣 環境預報","每回合的風向、風力與霧都會事先顯示。"],["🧭 綜合規劃","先處理哪一個海廢，會影響後續局面。"]],
    rulesFull:["延續 Level 2 所有聚集、纏繞、解纏與拆分規則，並加入風與霧。","環境條件採固定循環，確保每次挑戰可預測。"],
    intro:[{sel:".current-banner",title:"環境綜合挑戰",text:"從這關開始，要一起看洋流、風向、風力與霧。<br>環境不是隨機的，先看預報再規劃。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:6, goalKinds:{plastic:1}, missionStudent:"正確處理 <b>6 個海廢</b>，至少包含 <b>1 個塑膠袋</b>，成功<b>解纏 1 次</b>，並成功完成至少 <b>1 次環境預判</b>。",
    completeText:"你已經能綜合判斷洋流、風、霧與纏繞！",
  },
  "3-5": {
    id:"3-5", name:"Level 3-5", theme:"current", ship:{x:4,y:8,dir:"up"},
    wastes:[[2,4,"plastic","clean"],[6,6,"plastic","clean"],[8,3,"bottle"],[3,5,"bottle"],[5,4,"bottle"],[1,3,"cup"],[4,6,"cup"],[7,7,"cup"],[5,7,"cup"]],
    reefs:[[4,3],[7,4],[3,6],[7,6],[5,2],[8,5]], zoneA:[7,1], zoneB:[2,1], zoneNames:{A:"A 回收區",B:"B 垃圾區"},
    wasteWord:"海廢", tutorial:false, current:{dir:"right",label:"→ 往右（東）"}, stackLimit:2, cargoCapacity:4,
    allowEntangle:true, allowSplitEntangle:true, untangleTool:true, requireUntangle:true,
    weatherSeq:[
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:false},
      {wind:{dir:"left",strength:2,label:"← 往左・強風（2 格）"},fog:false},
      {wind:{dir:"up",strength:1,label:"↑ 往上・弱風（1 格）"},fog:true},
      {wind:{dir:"down",strength:1,label:"↓ 往下・弱風（1 格）"},fog:false},
    ], fogHideCount:2,
    prediction:"wasteAfter", predTrigger:"currentEvent", predInline:true, requireFogPredictionMatch:true,
    rules:["這是 SEA SAVER 最終綜合任務。","洋流、風力、霧、聚集、纏繞與解纏都會出現。","所有環境條件都會事先預報，不靠運氣。","利用預判、迴圈與除錯完成任務。"],
    rulesMore:[["🏁 最終挑戰","不必清空所有海廢，重點是做出有效率的策略。"],["🌫️ 霧中推理","霧天也要利用已知資訊判斷海廢可能的位置。"]],
    rulesFull:["Level 3-5 不新增規則，整合前面所有機制。","環境循環固定為弱風→強風→霧→弱風。"],
    intro:[{sel:".current-banner",title:"SEA SAVER 最終任務",text:"沒有新規則了。<br>先觀察、再預判、安排程式，運用你前面學到的所有方法完成任務。"}],
    deck:{forward:8,backward:4,turnLeft:5,turnRight:5,loop:3}, openingGuarantee:false,
    goalTotal:7, goalKinds:{plastic:2}, missionStudent:"SEA SAVER 最終任務！正確處理 <b>7 個海廢</b>，至少包含 <b>2 個塑膠袋</b>，成功<b>解纏 1 次</b>，並成功完成至少 <b>1 次霧天預判</b>。",
    completeText:"SEA SAVER 最終任務完成！你成功運用預測、規劃與除錯處理複雜環境。",
  },
};