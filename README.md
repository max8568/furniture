# RoomFit 家具配置工具

以真實公分比例呈現房間與家具的 React 單頁應用。使用者可以加入家具、拖曳、旋轉，並查看家具到牆面及最近家具的淨距。

## 本機執行

```bash
npm install
npm run dev
```

正式建置與測試：

```bash
npm test
npm run build
```

## 線上版本

推送至 `main` 分支後，GitHub Actions 會自動測試、建置並發布到：

<https://max8568.github.io/furniture/>

## 房型設定

房間多邊形、牆段、門窗／柱體及家具規格集中在 `src/config.ts`。畫布內部座標皆以公分為單位；若房型更新，只需替換 `ROOM` 定義，幾何、吸附與距離計算不需重寫。

目前房型依 `room.png` 的標示建立，總外框為 401 × 224 cm，包含 96 × 73 cm 左上凹口與 80 cm 門口。
