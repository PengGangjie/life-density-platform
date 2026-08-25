# 人生量化工具箱（网页 + PWA）

独立项目，与实训科管理平台（`gxstzy-shixun`）**分开**：

| | 人生量化 | 实训科 |
|--|----------|--------|
| Space | `life-density` | `gxstzy-shixun` |
| 凭证 | `secrets/life-density/` | `secrets/shixun-platform/` |
| Logto 应用 | 新建 `life-density` | `gxstzy-shixun-platform` |
| Turso 库 | 新建 `life-density` | `gxstzy-shixun` |

未登录可先试用（数据在浏览器）；配好独立 Logto + Turso 后可注册并云同步。

## 本地

```powershell
cd c:\00CS\text
.\venv\Scripts\python.exe scripts\sync_life_density_static.py
cd output\life-density-platform
..\..\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8010
```

## 部署

1. 按 `secrets/life-density/README.md` 新建 Logto 应用与 Turso 库，写入 `.env`
2. `.\venv\Scripts\python.exe scripts\deploy_life_density_space.py`

线上：https://life-density.ai-builders.space
