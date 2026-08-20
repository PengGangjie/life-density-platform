# 人生量化工具箱（网页 + PWA）

本地十合一工具的云端版：Logto 注册登录，Turso 同步数据，手机「添加到主屏幕」当 APP 用。

## 本地运行

```powershell
cd c:\00CS\text
.\venv\Scripts\python.exe scripts\sync_life_density_static.py
cd output\life-density-platform
..\..\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8010
```

打开 http://127.0.0.1:8010/ — 未登录也能用（数据在浏览器）；登录后写入云端。

## Space

- **service_name**：`life-density`
- **URL**：https://life-density.ai-builders.space
- Logto Redirect URI：`https://life-density.ai-builders.space/callback`
- Post sign-out：`https://life-density.ai-builders.space/`

可复用实训科同一套 Logto 应用，把上面两条 URI **Add another** 进去即可。
