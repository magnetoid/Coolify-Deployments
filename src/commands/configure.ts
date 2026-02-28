import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { CoolifyService } from '../services/CoolifyService';
import { isValidUrl, normalizeUrl } from '../utils/urlValidator';

export async function configureCommand(
  configManager: ConfigurationManager,
  updateConfigurationState: () => Promise<void>
) {
  try {
    // Step 1: Get and validate server URL
    const serverUrl = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      prompt: 'Enter your Coolify server URL along with the port',
      placeHolder: 'e.g., http://127.0.0.1:8000',
      validateInput: (value) => {
        if (!value) {
          return 'Server URL is required';
        }
        if (!isValidUrl(value)) {
          return 'Invalid URL format';
        }
        return null;
      },
    });

    if (!serverUrl) {
      return;
    }

    const normalizedUrl = normalizeUrl(serverUrl);

    // Test server connection
    const testService = new CoolifyService(normalizedUrl, '');
    const isReachable = await testService.testConnection();

    if (!isReachable) {
      throw new Error(
        'Could not connect to the Coolify server. Please check the URL and try again.'
      );
    }

    // Step 2: Get and validate access token
    const token = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      prompt: 'Enter your Coolify access token',
      password: true,
      placeHolder: 'Your Coolify API token',
      validateInput: (value) => {
        if (!value) {
          return 'Access token is required';
        }
        return null;
      },
    });

    if (!token) {
      return; // User cancelled
    }

    // Verify token
    const service = new CoolifyService(normalizedUrl, token);
    const isValid = await service.verifyToken();

    if (!isValid) {
      throw new Error(
        'Invalid access token. Please check your token and try again.'
      );
    }

    // Save configuration
    await configManager.setServerUrl(normalizedUrl);
    await configManager.setToken(token);
    await updateConfigurationState();

    vscode.window.showInformationMessage(
      'Coolify for VSCode configured successfully!'
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      error instanceof Error
        ? error.message
        : 'Configuration failed. Please try again.'
    );
  }
}

export async function reconfigureCommand(
  configManager: ConfigurationManager,
  updateConfigurationState: () => Promise<void>
) {
  const result = await vscode.window.showWarningMessage(
    'This will clear your existing configuration. Do you want to continue?',
    'Yes',
    'No'
  );

  if (result === 'Yes') {
    await configManager.clearConfiguration();
    await updateConfigurationState();
    await vscode.commands.executeCommand('coolify.configure');
  }
}
