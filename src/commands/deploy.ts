import * as vscode from 'vscode';
import { CoolifyWebViewProvider } from '../providers/CoolifyWebViewProvider';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { CoolifyService } from '../services/CoolifyService';

export async function startDeploymentCommand(
    webviewProvider: CoolifyWebViewProvider | undefined
) {
    try {
        if (!webviewProvider) {
            vscode.window.showErrorMessage('Coolify provider not initialized');
            return;
        }
        const applications = await webviewProvider.getApplications();

        if (!applications || applications.length === 0) {
            vscode.window.showInformationMessage('No applications found');
            return;
        }

        const selected = await vscode.window.showQuickPick(
            applications.map((app) => ({
                label: app.name,
                description: app.status,
                detail: `Status: ${app.status}`,
                id: app.id,
            })),
            {
                placeHolder: 'Select an application to deploy',
                title: 'Start Deployment',
            }
        );

        if (selected) {
            await webviewProvider.deployApplication(selected.id);
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            error instanceof Error ? error.message : 'Failed to start deployment'
        );
    }
}

export async function cancelDeploymentCommand(
    configManager: ConfigurationManager
) {
    try {
        const serverUrl = await configManager.getServerUrl();
        const token = await configManager.getToken();

        if (!serverUrl || !token) {
            throw new Error('Extension not configured properly');
        }

        const service = new CoolifyService(serverUrl, token);
        const deployments = await service.getDeployments();
        const inProgress = deployments.filter(d => d.status === 'in_progress' || d.status === 'queued');

        if (!inProgress || inProgress.length === 0) {
            vscode.window.showInformationMessage('No active deployments found');
            return;
        }

        const selected = await vscode.window.showQuickPick(
            inProgress.map((d) => ({
                label: `Cancel: ${d.application_name || 'Deployment'}`,
                description: d.status,
                detail: d.commit_message || `Deployment ID: ${d.id}`,
                id: d.id,
            })),
            {
                placeHolder: 'Select a deployment to cancel',
                title: 'Cancel Deployment',
            }
        );

        if (selected) {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Canceling ${selected.label}...`,
                    cancellable: false,
                },
                async () => {
                    await service.cancelDeployment(selected.id);
                    vscode.window.showInformationMessage(`Successfully canceled deployment.`);
                }
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            error instanceof Error ? error.message : 'Failed to cancel deployment'
        );
    }
}
