<div align="center">

<img src="public/logo.png" alt="Coolify Logo" width="100" />

# Coolify Deployments

### Deploy, manage & monitor your [Coolify](https://coolify.io) infrastructure — without leaving your editor

<br/>

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/NitinRanganath.vscode-coolify?style=for-the-badge&logo=visual-studio-code&label=VS%20Code&color=007ACC)](https://marketplace.visualstudio.com/items?itemName=NitinRanganath.vscode-coolify)
[![Open VSX](https://img.shields.io/open-vsx/v/NitinRanganath/vscode-coolify?style=for-the-badge&label=Open%20VSX&color=C160EF)](https://open-vsx.org/extension/NitinRanganath/vscode-coolify)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/NitinRanganath.vscode-coolify?style=for-the-badge&color=4CAF50)](https://marketplace.visualstudio.com/items?itemName=NitinRanganath.vscode-coolify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

**Works in** &nbsp;
![VS Code](https://img.shields.io/badge/VS%20Code-✓-007ACC?logo=visual-studio-code&logoColor=white)
![Cursor](https://img.shields.io/badge/Cursor-✓-black?logo=cursor&logoColor=white)
![Windsurf](https://img.shields.io/badge/Windsurf-✓-5C5CFF)
![Trae](https://img.shields.io/badge/Trae-✓-FF6B35)
![VSCodium](https://img.shields.io/badge/VSCodium-✓-2F80ED)

</div>

---

## 🚀 What You Can Do

<table>
<tr>
<td width="50%">

**🌳 Native Sidebar Tree**
See all your apps, servers, and databases in a live, auto-refreshing tree — with color-coded status icons.

```
COOLIFY
├── 📦 Applications
│   ├── 🟢 coolify-api      running  [🚀 ↺ 📋]
│   ├── 🔴 marketing-site   stopped  [🚀 ↺ 📋]
│   └── 🟡 analytics        deploy…  [✖]
├── 🖥️  Servers
│   └── hetzner-prod-01  192.168.1.1
└── 🗄️  Databases
    └── pg-primary       PostgreSQL  [💾]
```

</td>
<td width="50%">

**⚡ Keyboard-First Workflow**

| Action | Mac | PC |
|---|---|---|
| 🚀 Deploy | `⌘⇧D` | `Ctrl+Shift+D` |
| 📋 View Logs | `⌘⇧L` | `Ctrl+Shift+L` |
| 🔄 Refresh | `⌘⇧R` | `Ctrl+Shift+R` |
| ✖ Cancel Deploy | `⌘⇧X` | `Ctrl+Shift+X` |

Right-click any tree item for **Start / Stop / Restart / Deploy / Backup** — instantly.

</td>
</tr>
</table>

---

## ✨ Feature Highlights

| | Feature | Description |
|---|---|---|
| 🌳 | **Native TreeView** | Live sidebar with collapsible Projects → Apps → Servers → Databases |
| 📊 | **Status Bar Monitor** | Pinned `🟢 my-app: Running` indicator, always visible |
| 📋 | **Log Streaming** | Real-time app logs in a dedicated Output Channel |
| ⚙️ | **Deployment Control** | Start, Stop, Restart, Deploy, or Cancel — from keyboard or mouse |
| 🗄️ | **Database Backups** | Trigger a backup with one click from the sidebar |
| 🔔 | **Smart Notifications** | Toast alerts on deployment success or failure |
| 🔑 | **Secure Token Storage** | API keys stored in the OS keychain via SecretStorage |
| 👥 | **Team Config Sharing** | Share server URL via `.vscode/settings.json` |

---

## 🏁 Getting Started

### 1 · Install

<details>
<summary><b>VS Code / Windsurf</b> — Marketplace</summary>

Press `Ctrl+Shift+X`, search for **Coolify Deployments**, click Install.

Or install from CLI:

```bash
code --install-extension NitinRanganath.vscode-coolify
```

</details>

<details>
<summary><b>Cursor / Trae / VSCodium</b> — Open VSX or manual .vsix</summary>

**Option A — Open VSX** (if your editor supports it):
Search "Coolify Deployments" in the Extensions panel.

**Option B — Manual `.vsix`** (always works):

1. Download the latest `.vsix` from [GitHub Releases →](https://github.com/itsnitinr/coolify-vscode-extension/releases)
2. `Cmd/Ctrl+Shift+P` → **"Extensions: Install from VSIX…"**

</details>

### 2 · Configure

```
Cmd/Ctrl+Shift+P  →  Coolify: Configure
```

Enter your **Coolify server URL** (e.g. `https://coolify.my-server.com`) and your **API token** from Coolify → Profile → API Keys.

### 3 · Deploy 🎉

Your apps appear instantly. Hit `Cmd+Shift+D` or click the 🚀 button next to any app.

---

## 👥 Team Setup

Drop this into your repo's `.vscode/settings.json` so every teammate connects automatically — they only need to enter their personal token once:

```json
{
  "coolify.serverUrl": "https://coolify.my-company.internal"
}
```

The server URL syncs via Settings Sync. The token is **never synced** — it stays encrypted on each machine.

---

## ⚙️ All Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `coolify.serverUrl` | `string` | `""` | Server URL (also set via `.vscode/settings.json`) |
| `coolify.refreshInterval` | `number` | `5000` | Sidebar auto-refresh interval in ms (min 2000) |
| `coolify.defaultApplication` | `string` | `""` | UUID to pin to the Status Bar |
| `coolify.enableNotifications` | `boolean` | `true` | Toast on deployment complete / failed |

---

## 🔒 Security

- API tokens are stored using **VS Code SecretStorage** (encrypted system keychain)
- Editors without SecretStorage support receive a warning; a plaintext fallback is used
- The token is **never included** in Settings Sync or `.vscode/settings.json`
- The extension only makes **outbound HTTPS calls** to your server — no code from your workspace is ever executed

---

## 🛠️ Editor Compatibility Matrix

| Editor | Install Method | SecretStorage | Settings Sync | Remote/SSH |
|---|---|---|---|---|
| VS Code | Marketplace | ✅ Full | ✅ | ✅ |
| Cursor | Open VSX / `.vsix` | ✅ Full | ✅ | ✅ |
| Windsurf | Open VSX / `.vsix` | ✅ Full | — | ✅ |
| Trae | Open VSX / `.vsix` | ✅ Full | — | ✅ |
| VSCodium | Open VSX / `.vsix` | ⚠️ Fallback | — | ✅ |

> ⚠️ **Remote sessions**: When running in an SSH / Dev Container / Codespaces session, the extension runs on the **remote host**. Your Coolify server must be reachable from that host, not just from your laptop.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR on [GitHub](https://github.com/itsnitinr/coolify-vscode-extension).

---

<div align="center">

Made with ❤️ by [Nitin Ranganath](https://nitinranganath.com) &nbsp;·&nbsp; MIT License &nbsp;·&nbsp; [Coolify](https://coolify.io)

</div>
