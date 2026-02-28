import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { CoolifyService } from '../services/CoolifyService';
import { Application, Database } from '../types';

let logsOutputChannel: vscode.OutputChannel | undefined;

function getLogsChannel(): vscode.OutputChannel {
    if (!logsOutputChannel) {
        logsOutputChannel = vscode.window.createOutputChannel('Coolify Logs');
    }
    return logsOutputChannel;
}

export async function viewApplicationLogsCommand(
    configManager: ConfigurationManager,
    app?: { id: string; name: string }
) {
    try {
        const serverUrl = await configManager.getServerUrl();
        const token = await configManager.getToken();

        if (!serverUrl || !token) {
            throw new Error('Extension not configured properly');
        }

        const service = new CoolifyService(serverUrl, token);

        // If no app passed in (e.g. from command palette), show a QuickPick
        let targetId = app?.id;
        let targetName = app?.name;

        if (!targetId) {
            const applications = await service.getApplications();
            if (!applications || applications.length === 0) {
                vscode.window.showInformationMessage('No applications found');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                applications.map((a: Application) => ({
                    label: a.name,
                    description: a.status,
                    detail: a.fqdn,
                    id: a.id || a.uuid || '',
                })),
                { placeHolder: 'Select an application to view logs', title: 'Coolify: View Logs' }
            );

            if (!selected) { return; }
            targetId = selected.id;
            targetName = selected.label;
        }

        const channel = getLogsChannel();
        channel.clear();
        channel.show(true);
        channel.appendLine(`── Coolify Logs — ${targetName} ──`);
        channel.appendLine(`Fetching logs from ${serverUrl}...`);
        channel.appendLine('');

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Fetching logs for ${targetName}...`,
                cancellable: false,
            },
            async () => {
                const logs = await service.getApplicationLogs(targetId!);
                channel.appendLine(logs || '(No log output)');
            }
        );
    } catch (error) {
        vscode.window.showErrorMessage(
            error instanceof Error ? error.message : 'Failed to fetch logs'
        );
    }
}

export async function createDatabaseBackupCommand(
    configManager: ConfigurationManager,
    db?: { id: string; name: string }
) {
    try {
        const serverUrl = await configManager.getServerUrl();
        const token = await configManager.getToken();
        if (!serverUrl || !token) { throw new Error('Extension not configured properly'); }

        const service = new CoolifyService(serverUrl, token);

        let targetId = db?.id;
        let targetName = db?.name;

        if (!targetId) {
            const databases = await service.getDatabases();
            if (!databases || databases.length === 0) {
                vscode.window.showInformationMessage('No databases found');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                databases.map((d: Database) => ({
                    label: d.name,
                    description: d.type,
                    detail: d.status,
                    id: d.uuid,
                })),
                { placeHolder: 'Select a database to back up', title: 'Coolify: Create Database Backup' }
            );

            if (!selected) { return; }
            targetId = selected.id;
            targetName = selected.label;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Creating backup for ${targetName}...`,
                cancellable: false,
            },
            async () => {
                await service.createDatabaseBackup(targetId!);
                vscode.window.showInformationMessage(`✅ Backup created for ${targetName}`);
            }
        );
    } catch (error) {
        vscode.window.showErrorMessage(
            error instanceof Error ? error.message : 'Failed to create backup'
        );
    }
}
