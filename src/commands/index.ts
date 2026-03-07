import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { CoolifyTreeDataProvider, CoolifyTreeItem } from '../providers/CoolifyTreeDataProvider';
import { CoolifyService } from '../services/CoolifyService';
import { Application } from '../types';
import { StatusBarManager } from '../managers/StatusBarManager';

const execAsync = promisify(exec);
import { startDeploymentCommand, cancelDeploymentCommand, runDeploymentFlow, deployCurrentProjectCommand, forceDeploymentCommand } from './deploy';
import { startApplicationCommand, stopApplicationCommand, restartApplicationCommand } from './applicationActions';
import { startDatabaseCommand, stopDatabaseCommand } from './databaseActions';
import { viewApplicationLogsCommand, viewApplicationLogsLiveCommand, createDatabaseBackupCommand } from './logs';
import { openInBrowserCommand, copyUuidCommand, quickDeployCommand, testConnectionCommand } from './browser';
import { CoolifyDashboardPanel } from '../panels/CoolifyDashboardPanel';
import { installCoolifyCli } from '../utils/cliBridge';

export function registerCommands(
    context: vscode.ExtensionContext,
    configManager: ConfigurationManager,
    treeDataProvider: CoolifyTreeDataProvider,
    updateConfigurationState: () => Promise<void>,
    statusBarManager: StatusBarManager
) {
    const register = (id: string, fn: (...args: any[]) => any) =>
        context.subscriptions.push(vscode.commands.registerCommand(id, fn));

    // ─── Authentication ──────────────────────────────────────────────────────────
    register('coolify.login', async () => {
        try {
            await vscode.authentication.getSession('coolify', ['coolify'], { createIfNone: true });
            await updateConfigurationState();
            vscode.window.showInformationMessage('🎉 Signed in to Coolify!');
        } catch (error) {
            vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Login failed');
        }
    });

    register('coolify.logout', async () => {
        const session = await vscode.authentication.getSession('coolify', ['coolify']);
        if (session) {
            // The AuthProvider handles clearing configs when removeSession is called
            // We just ask VS Code to forget the session.
            // Note: vscode.authentication API lacks a direct `removeSession`, 
            // so we do it via the Auth Provider under the hood or config manager.
            await configManager.clearConfiguration();
            await updateConfigurationState();
            vscode.window.showInformationMessage('Signed out of Coolify');
        }
    });

    // ─── Tree Refresh & Dashboard ───────────────────────────────────────────────
    register('coolify.refreshApplications', async () => {
        await treeDataProvider.loadData();
        vscode.window.showInformationMessage('Coolify: Refreshed');
    });

    register('coolify.openDashboard', () => {
        CoolifyDashboardPanel.createOrShow(context.extensionUri, configManager);
    });

    // ─── Application Actions (Command Palette + TreeView context + AI/API) ───

    // AI Agent Callable API structure: vscode.commands.executeCommand('coolify.action', 'target-uuid', 'target-name')

    register('coolify.startDeployment', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            // Invoked by AI / API
            return runDeploymentFlow(configManager, itemOrUuid, name);
        } else if (itemOrUuid?.kind === 'application' && itemOrUuid.rawData) {
            // Invoked via TreeView menu
            const app = itemOrUuid.rawData as Application;
            return runDeploymentFlow(configManager, app.uuid || app.id || '', app.name);
        }
        // Invoked via Command Palette
        return startDeploymentCommandWrapper(configManager, treeDataProvider);
    });

    register('coolify.deployCurrentProject', () => deployCurrentProjectCommand(configManager, statusBarManager));

    register('coolify.forceDeployment', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return runDeploymentFlow(configManager, itemOrUuid, name, true);
        } else if (itemOrUuid?.kind === 'application' && itemOrUuid.rawData) {
            const app = itemOrUuid.rawData as Application;
            return runDeploymentFlow(configManager, app.uuid || app.id || '', app.name, true);
        }
        return forceDeploymentCommand(configManager, treeDataProvider);
    });

    register('coolify.cancelDeployment', () => cancelDeploymentCommand(configManager));

    register('coolify.startApplication', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return _appAction(configManager, itemOrUuid, name || 'Application', 'start');
        } else if (itemOrUuid?.kind === 'application' && itemOrUuid.rawData) {
            const app = itemOrUuid.rawData as Application;
            return _appAction(configManager, app.uuid || app.id || '', app.name, 'start');
        }
        return startApplicationCommand(undefined, configManager);
    });

    register('coolify.stopApplication', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return _appAction(configManager, itemOrUuid, name || 'Application', 'stop');
        } else if (itemOrUuid?.kind === 'application' && itemOrUuid.rawData) {
            const app = itemOrUuid.rawData as Application;
            return _appAction(configManager, app.uuid || app.id || '', app.name, 'stop');
        }
        return stopApplicationCommand(undefined, configManager);
    });

    register('coolify.restartApplication', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return _appAction(configManager, itemOrUuid, name || 'Application', 'restart');
        } else if (itemOrUuid?.kind === 'application' && itemOrUuid.rawData) {
            const app = itemOrUuid.rawData as Application;
            return _appAction(configManager, app.uuid || app.id || '', app.name, 'restart');
        }
        return restartApplicationCommand(undefined, configManager);
    });

    // ─── Logs ───────────────────────────────────────────────────────────────────
    register('coolify.viewApplicationLogs', (itemOrUuid?: CoolifyTreeItem | { id: string; name: string } | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return viewApplicationLogsCommand(configManager, { id: itemOrUuid, name: name || 'Application' });
        } else if (itemOrUuid && 'kind' in itemOrUuid && itemOrUuid.kind === 'application' && itemOrUuid.rawData) {
            const app = itemOrUuid.rawData as Application;
            return viewApplicationLogsCommand(configManager, { id: app.uuid || app.id || '', name: app.name });
        } else if (itemOrUuid && typeof itemOrUuid === 'object' && 'id' in itemOrUuid) {
            return viewApplicationLogsCommand(configManager, itemOrUuid as { id: string; name: string });
        }
        return viewApplicationLogsCommand(configManager);
    });

    register('coolify.viewApplicationLogsLive', (itemOrUuid?: CoolifyTreeItem | { id: string; name: string } | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return viewApplicationLogsLiveCommand(configManager, { id: itemOrUuid, name: name || 'Application' });
        } else if (itemOrUuid && 'kind' in itemOrUuid && itemOrUuid.kind === 'application' && itemOrUuid.rawData) {
            const app = itemOrUuid.rawData as Application;
            return viewApplicationLogsLiveCommand(configManager, { id: app.uuid || app.id || '', name: app.name });
        } else if (itemOrUuid && typeof itemOrUuid === 'object' && 'id' in itemOrUuid) {
            return viewApplicationLogsLiveCommand(configManager, itemOrUuid as { id: string; name: string });
        }
        return viewApplicationLogsLiveCommand(configManager);
    });

    // ─── Databases ──────────────────────────────────────────────────────────────
    register('coolify.startDatabase', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return startDatabaseCommand(undefined, configManager, itemOrUuid, name);
        } else if (itemOrUuid?.kind === 'database' && itemOrUuid.rawData) {
            const db = itemOrUuid.rawData as import('../types').Database;
            return startDatabaseCommand(undefined, configManager, db.uuid, db.name);
        }
        return startDatabaseCommand(undefined, configManager);
    });

    register('coolify.stopDatabase', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return stopDatabaseCommand(undefined, configManager, itemOrUuid, name);
        } else if (itemOrUuid?.kind === 'database' && itemOrUuid.rawData) {
            const db = itemOrUuid.rawData as import('../types').Database;
            return stopDatabaseCommand(undefined, configManager, db.uuid, db.name);
        }
        return stopDatabaseCommand(undefined, configManager);
    });

    register('coolify.createDatabaseBackup', (itemOrUuid?: CoolifyTreeItem | string, name?: string) => {
        if (typeof itemOrUuid === 'string') {
            return createDatabaseBackupCommand(configManager, { id: itemOrUuid, name: name || 'Database' });
        } else if (itemOrUuid?.kind === 'database' && itemOrUuid.rawData) {
            const db = itemOrUuid.rawData as import('../types').Database;
            return createDatabaseBackupCommand(configManager, { id: db.uuid, name: db.name });
        }
        return createDatabaseBackupCommand(configManager);
    });

    // ─── Browser / Utility ──────────────────────────────────────────────────────
    register('coolify.openInBrowser', (item?: CoolifyTreeItem) =>
        openInBrowserCommand(configManager, treeDataProvider, item)
    );

    register('coolify.copyUuid', (item?: CoolifyTreeItem) =>
        copyUuidCommand(treeDataProvider, item)
    );

    register('coolify.quickDeploy', () =>
        quickDeployCommand(configManager, treeDataProvider)
    );

    register('coolify.testConnection', () =>
        testConnectionCommand(configManager)
    );

    register('coolify.installCli', () => installCoolifyCli());

    // ─── AI Agent API (Headless Commands) ────────────────────────────────────────
    register('coolify.api.getApplications', async () => {
        try {
            const serverUrl = await configManager.getServerUrl();
            const token = await configManager.getToken();
            if (!serverUrl || !token) { return { error: 'Not configured' }; }
            const service = new CoolifyService(serverUrl, token);
            return await service.getApplications();
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) };
        }
    });

    register('coolify.api.getApplicationLogs', async (uuid: string) => {
        if (!uuid) { return { error: 'UUID is required' }; }
        try {
            const serverUrl = await configManager.getServerUrl();
            const token = await configManager.getToken();
            if (!serverUrl || !token) { return { error: 'Not configured' }; }
            const service = new CoolifyService(serverUrl, token);
            return await service.getApplicationLogs(uuid);
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) };
        }
    });

    register('coolify.api.deployApplication', async (uuid: string) => {
        if (!uuid) { return { error: 'UUID is required' }; }
        try {
            const serverUrl = await configManager.getServerUrl();
            const token = await configManager.getToken();
            if (!serverUrl || !token) { return { error: 'Not configured' }; }
            const service = new CoolifyService(serverUrl, token);
            const deployUuid = await service.startDeployment(uuid);
            return { success: !!deployUuid, deployUuid };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) };
        }
    });

    // ─── Zero-config workspace-aware API commands for AI agents ───────────────────
    //
    // Agents don't need to know the app UUID — these commands auto-detect
    // the Coolify app that matches the current workspace's git remote.
    //
    // Usage examples an agent can follow:
    //   "check coolify logs"       → executeCommand('coolify.api.getWorkspaceLogs')
    //   "check error logs"         → executeCommand('coolify.api.getWorkspaceLogs')
    //   "what's the deploy status" → executeCommand('coolify.api.getWorkspaceApp')
    //   "show deployment errors"   → executeCommand('coolify.api.getLatestDeploymentLogs')

    /**
     * Returns metadata about the Coolify app that matches the current workspace.
     * Safe to call first — gives the agent the UUID to use in subsequent calls.
     */
    register('coolify.api.getWorkspaceApp', async () => {
        try {
            const serverUrl = await configManager.getServerUrl();
            const token = await configManager.getToken();
            if (!serverUrl || !token) { return { error: 'Not configured' }; }

            const matchedApps = statusBarManager.getMatchedApps();
            if (matchedApps.length === 0) {
                // Fallback: try to detect via git remote ourselves
                const detected = await detectWorkspaceApp(configManager);
                if (!detected) { return { error: 'No Coolify app matched to this workspace. Make sure the git remote matches an app in Coolify.' }; }
                return detected;
            }
            // Return the best match (first if multiple)
            const app = matchedApps[0];
            return { uuid: app.uuid || app.id, name: app.name, status: app.status, fqdn: app.fqdn, git_branch: app.git_branch };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) };
        }
    });

    /**
     * Fetches the runtime application logs for the workspace-matched Coolify app.
     * No UUID needed — auto-detects via git remote.
     * Returns the raw log text so the agent can read and fix issues.
     */
    register('coolify.api.getWorkspaceLogs', async () => {
        try {
            const serverUrl = await configManager.getServerUrl();
            const token = await configManager.getToken();
            if (!serverUrl || !token) { return { error: 'Not configured' }; }

            const app = await getMatchedApp(configManager, statusBarManager);
            if (!app || typeof app === 'object' && 'error' in app) { return app ?? { error: 'No matched app' }; }

            const service = new CoolifyService(serverUrl, token);
            const uuid = (app as Application).uuid || (app as Application).id;
            const logs = await service.getApplicationLogs(uuid);
            return { appName: (app as Application).name, uuid, logs: logs || '(no logs yet)' };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) };
        }
    });

    /**
     * Fetches build/deploy logs from the most recent deployment of the workspace app.
     * Useful for diagnosing deployment failures.
     */
    register('coolify.api.getLatestDeploymentLogs', async () => {
        try {
            const serverUrl = await configManager.getServerUrl();
            const token = await configManager.getToken();
            if (!serverUrl || !token) { return { error: 'Not configured' }; }

            const app = await getMatchedApp(configManager, statusBarManager);
            if (!app || typeof app === 'object' && 'error' in app) { return app ?? { error: 'No matched app' }; }

            const service = new CoolifyService(serverUrl, token);
            const uuid = (app as Application).uuid || (app as Application).id;
            const deployments = await service.getApplicationDeployments(uuid);

            if (!deployments || deployments.length === 0) {
                return { error: 'No deployments found for this app', appName: (app as Application).name };
            }

            // Most recent deployment first
            const latest = deployments[0];
            const detail = await service.getDeployment(latest.id);
            return {
                appName: (app as Application).name,
                deploymentId: latest.id,
                status: detail.status,
                logs: detail.logs || '(no deploy logs)',
            };
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) };
        }
    });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function startDeploymentCommandWrapper(
    configManager: ConfigurationManager,
    treeDataProvider: CoolifyTreeDataProvider
) {
    const apps = treeDataProvider.getCachedApplications();
    if (!apps || apps.length === 0) {
        vscode.window.showInformationMessage('No applications found');
        return;
    }

    const selected = await vscode.window.showQuickPick(
        apps.map(app => ({
            label: app.name,
            description: app.status,
            detail: app.fqdn,
            id: app.id || app.uuid || '',
        })),
        { placeHolder: 'Select an application to deploy', title: 'Start Deployment' }
    );

    if (selected) {
        await runDeploymentFlow(configManager, selected.id, selected.label);
    }
}

async function _appAction(
    configManager: ConfigurationManager,
    uuid: string,
    name: string,
    action: 'start' | 'stop' | 'restart'
) {
    const serverUrl = await configManager.getServerUrl();
    const token = await configManager.getToken();
    if (!serverUrl || !token) { throw new Error('Not configured'); }

    const service = new CoolifyService(serverUrl, token);
    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `${action}ing ${name}...`, cancellable: false },
        async () => {
            if (action === 'start') { await service.startApplication(uuid); }
            else if (action === 'stop') { await service.stopApplication(uuid); }
            else { await service.restartApplication(uuid); }

            const enableNotifications = vscode.workspace.getConfiguration('coolify').get<boolean>('enableNotifications', true);
            if (enableNotifications) {
                vscode.window.showInformationMessage(`✅ ${name} ${action}ed`);
            }
        }
    );
}

/**
 * Returns the Coolify app for the current workspace — first tries the status bar's
 * already-cached match, then falls back to a fresh git remote + API lookup.
 */
async function getMatchedApp(
    configManager: ConfigurationManager,
    statusBarManager: StatusBarManager
): Promise<Application | { error: string } | null> {
    const cached = statusBarManager.getMatchedApps();
    if (cached.length > 0) { return cached[0]; }
    return detectWorkspaceApp(configManager);
}

/**
 * Detects which Coolify app belongs to the current workspace by reading the
 * git remote URL and matching it against all apps in Coolify.
 * Returns the matched Application or null if nothing matched.
 */
async function detectWorkspaceApp(
    configManager: ConfigurationManager
): Promise<Application | { error: string } | null> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return { error: 'No workspace folder open' };
    }

    // Read the git remote for the current workspace
    let remoteUrl: string | undefined;
    try {
        const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: folders[0].uri.fsPath });
        remoteUrl = stdout.trim().replace(/\.git$/, '').toLowerCase();
    } catch {
        return { error: 'Could not read git remote — is this a git repository?' };
    }

    if (!remoteUrl) { return { error: 'No git remote found' }; }

    // Normalize: extract "owner/repo" from SSH or HTTPS URL
    const normalizeUrl = (url: string) => {
        const match = url.match(/[:/]([^/]+\/[^/]+)$/);
        return match ? match[1].toLowerCase() : url;
    };
    const normalizedRemote = normalizeUrl(remoteUrl);

    // Fetch all apps and find one whose git_repository matches
    const serverUrl = await configManager.getServerUrl();
    const token = await configManager.getToken();
    if (!serverUrl || !token) { return { error: 'Not configured' }; }

    const service = new CoolifyService(serverUrl, token);
    const apps = await service.getApplications();

    const matched = apps.find(a => {
        if (!a.git_repository) { return false; }
        const appRepo = normalizeUrl(a.git_repository.replace(/\.git$/, '').toLowerCase());
        return normalizedRemote.endsWith(appRepo) || appRepo.endsWith(normalizedRemote);
    });

    return matched ?? { error: `No Coolify app found for remote: ${remoteUrl}` };
}
