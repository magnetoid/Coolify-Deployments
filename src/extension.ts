import * as vscode from 'vscode';
import { ConfigurationManager } from './managers/ConfigurationManager';
import { StatusBarManager } from './managers/StatusBarManager';
import { CoolifyTreeDataProvider } from './providers/CoolifyTreeDataProvider';
import { registerCommands } from './commands';

// ─── Editor Detection ─────────────────────────────────────────────────────────
// Cursor, Trae, Windsurf, VSCodium, and others all expose their name via
// vscode.env.appName. We use this to tailor messaging without breaking anything.
function detectEditorName(): { name: string; isCursor: boolean; isTrae: boolean; isWindsurf: boolean; isVSCodium: boolean; isAntigravity: boolean } {
  const appName = vscode.env.appName ?? '';
  const lower = appName.toLowerCase();
  return {
    name: appName,
    isCursor: lower.includes('cursor'),
    isTrae: lower.includes('trae'),
    isWindsurf: lower.includes('windsurf'),
    isVSCodium: lower.includes('vscodium') || lower.includes('codium'),
    isAntigravity: lower.includes('antigravity'),
  };
}

let treeDataProvider: CoolifyTreeDataProvider | undefined;
let statusBarManager: StatusBarManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  // ─── Detect host editor ───────────────────────────────────────────────────
  const editor = detectEditorName();
  console.log(`[Coolify] Running in: ${editor.name}`);

  // ─── Remote environment advisory ─────────────────────────────────────────
  // Cursor, Windsurf, and VS Code all support remote/SSH/Dev Container sessions.
  // When running remotely, the extension host runs ON the remote machine.
  // Coolify must be reachable from that machine, not just from the user's laptop.
  const isRemote = vscode.env.remoteName !== undefined && vscode.env.remoteName !== '';
  const remoteAdvisoryShown = context.globalState.get<boolean>('coolify.remoteAdvisoryShown');
  if (isRemote && !remoteAdvisoryShown) {
    vscode.window.showInformationMessage(
      `Coolify: You are in a remote session (${vscode.env.remoteName}). ` +
      'Make sure your Coolify server is reachable FROM this remote host.',
      'Got it'
    ).then(() => {
      context.globalState.update('coolify.remoteAdvisoryShown', true);
    });
  }

  // ─── Core managers ────────────────────────────────────────────────────────
  const configManager = new ConfigurationManager(context);

  // ─── Native TreeView ──────────────────────────────────────────────────────
  treeDataProvider = new CoolifyTreeDataProvider(configManager);

  const treeView = vscode.window.createTreeView('coolify-deployments', {
    treeDataProvider,
    showCollapseAll: true,
  });

  // ─── Status Bar ───────────────────────────────────────────────────────────
  statusBarManager = new StatusBarManager(configManager);

  context.subscriptions.push(
    treeView,
    { dispose: () => treeDataProvider?.dispose() },
    { dispose: () => statusBarManager?.dispose() },
  );

  // ─── Configuration state helper ───────────────────────────────────────────
  async function updateConfigurationState() {
    const isConfigured = await configManager.isConfigured();
    await vscode.commands.executeCommand('setContext', 'coolify.isConfigured', isConfigured);

    if (isConfigured) {
      await treeDataProvider?.loadData();
      await statusBarManager?.initialize();
    } else {
      treeDataProvider?.refresh();
    }
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  updateConfigurationState().then(() => {
    treeDataProvider?.initialize();
    statusBarManager?.initialize();
  });

  // ─── Listen for settings changes ─────────────────────────────────────────
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('coolify')) {
        updateConfigurationState();
      }
    })
  );

  // ─── Register all commands ────────────────────────────────────────────────
  registerCommands(context, configManager, treeDataProvider, updateConfigurationState);
}

export function deactivate() {
  treeDataProvider?.dispose();
  statusBarManager?.dispose();
}
