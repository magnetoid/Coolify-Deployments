import * as vscode from 'vscode';

/**
 * Guards any analytics call behind the editor's telemetry opt-in setting.
 * Works in VS Code, Cursor, Trae, Windsurf, VSCodium, and any VS Code fork.
 *
 * Usage:
 *   import { withTelemetryGuard } from '../utils/telemetry';
 *   withTelemetryGuard(() => sendAnalyticsEvent('deploy.started'));
 */
export function withTelemetryGuard(fn: () => void): void {
    try {
        if (vscode.env.isTelemetryEnabled === false) { return; }
        fn();
    } catch {
        // Silently skip — never let a telemetry check crash the extension
    }
}

/**
 * Returns whether telemetry is enabled by the user in their current editor.
 */
export function isTelemetryEnabled(): boolean {
    try {
        return vscode.env.isTelemetryEnabled !== false;
    } catch {
        return false;
    }
}
