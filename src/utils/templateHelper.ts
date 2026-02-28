import * as vscode from 'vscode';

export async function getWebViewHtml(extensionUri: vscode.Uri): Promise<string> {
    const htmlPath = vscode.Uri.joinPath(
        extensionUri,
        'dist',
        'templates',
        'webview.html'
    );
    const fileData = await vscode.workspace.fs.readFile(htmlPath);
    return Buffer.from(fileData).toString('utf-8');
}

export async function getWelcomeHtml(
    extensionUri: vscode.Uri,
    webview: vscode.Webview
): Promise<string> {
    const logoUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'public', 'logo.svg')
    );

    // Load welcome template and replace logo URI
    const welcomePath = vscode.Uri.joinPath(
        extensionUri,
        'dist',
        'templates',
        'welcome.html'
    );
    const fileData = await vscode.workspace.fs.readFile(welcomePath);
    let html = Buffer.from(fileData).toString('utf-8');
    html = html.replace('${logoUri}', logoUri.toString());

    return html;
}
