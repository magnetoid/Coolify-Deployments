import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';

export class StatusBarManager {
    private items: vscode.StatusBarItem[] = [];
    private pollInterval?: NodeJS.Timeout;
    private isDisposed = false;

    constructor(private configManager: ConfigurationManager) { }

    public async initialize(): Promise<void> {
        await this.refreshStatusBar();
        this.startPolling();
    }

    private startPolling(): void {
        const intervalMs = vscode.workspace
            .getConfiguration('coolify')
            .get<number>('refreshInterval', 5000);

        this.pollInterval = setInterval(async () => {
            if (!this.isDisposed) {
                await this.refreshStatusBar();
            }
        }, intervalMs);
    }

    public async refreshStatusBar(): Promise<void> {
        if (this.isDisposed) { return; }

        const isConfigured = await this.configManager.isConfigured();
        this.clearItems();

        if (!isConfigured) {
            return;
        }

        try {
            const serverUrl = await this.configManager.getServerUrl();
            const token = await this.configManager.getToken();

            if (!serverUrl || !token) { return; }

            const { CoolifyService } = await import('../services/CoolifyService');
            const service = new CoolifyService(serverUrl, token);
            const applications = await service.getApplications();

            const pinnedAppId = vscode.workspace
                .getConfiguration('coolify')
                .get<string>('defaultApplication');

            // Find pinned app or just show the first relevant one
            const appsToShow = pinnedAppId
                ? applications.filter(a => a.id === pinnedAppId || a.uuid === pinnedAppId)
                : applications.slice(0, 2);

            for (const app of appsToShow) {
                const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
                item.name = `Coolify — ${app.name}`;

                const statusIcon = this.getStatusIcon(app.status);
                item.text = `${statusIcon} ${app.name}: ${this.formatStatus(app.status)}`;
                item.tooltip = new vscode.MarkdownString(
                    `**Coolify App: ${app.name}**\n\nStatus: \`${app.status}\`\n\nClick to view logs`
                );
                item.command = {
                    title: 'View Logs',
                    command: 'coolify.viewApplicationLogs',
                    arguments: [{ id: app.id || app.uuid, name: app.name }],
                };

                this.applyStatusBackground(item, app.status);
                item.show();
                this.items.push(item);
            }
        } catch (error) {
            console.error('StatusBarManager: Failed to refresh:', error);
        }
    }

    private getStatusIcon(status: string): string {
        switch (status?.toLowerCase()) {
            case 'running': return '$(vm-running)';
            case 'stopped': case 'exited': return '$(vm-outline)';
            case 'deploying': case 'starting': return '$(sync~spin)';
            case 'error': case 'failed': return '$(error)';
            default: return '$(circle-outline)';
        }
    }

    private formatStatus(status: string): string {
        if (!status) { return 'Unknown'; }
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }

    private applyStatusBackground(item: vscode.StatusBarItem, status: string): void {
        switch (status?.toLowerCase()) {
            case 'error':
            case 'failed':
                item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case 'deploying':
            case 'starting':
                item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            default:
                item.backgroundColor = undefined;
        }
    }

    private clearItems(): void {
        for (const item of this.items) {
            item.dispose();
        }
        this.items = [];
    }

    public dispose(): void {
        this.isDisposed = true;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.clearItems();
    }
}
