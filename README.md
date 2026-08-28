# 砺行 · 日省（网页 + PWA）

主页写 **抉择 / 行动 / 愿想**；工具台收 **十二模块**（理性、日省、采样、调研、反思、意见、穿透力、双卡、偏差环、生命之轮、影响力、收获）。登录后 Turso 云同步，未登录可阅览工具台。

独立 Space，与实训科 `gxstzy-shixun` **分开**（各自 Logto 应用 + Turso 库）：

| | 砺行 · 日省 | 实训科 |
|--|-------------|--------|
| Space | `life-density` | `gxstzy-shixun` |
| 凭证 | `secrets/life-density/` | `secrets/shixun-platform/` |
| 线上 | [life-density.ai-builders.space](https://life-density.ai-builders.space) | [gxstzy-shixun.ai-builders.space](https://gxstzy-shixun.ai-builders.space) |

产品真源：`c:\00CS\砺行·日省\web\` · 扫码页 `/qr.html`

## 本地

```powershell
cd c:\00CS\text
.\venv\Scripts\python.exe scripts\sync_lixing_to_life_density_space.py
cd output\life-density-platform
..\..\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8010
```

或打开 `砺行·日省\web\打开砺行.bat` → http://127.0.0.1:8766/

## 部署

1. 按 `secrets/life-density/README.md` 配置 Logto + Turso → `secrets/life-density/.env`
2. `.\venv\Scripts\python.exe scripts\sync_lixing_to_life_density_space.py`
3. `.\venv\Scripts\python.exe scripts\deploy_life_density_space.py`
