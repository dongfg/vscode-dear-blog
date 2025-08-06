import * as vscode from 'vscode';
// 获取 VSCode 默认的 shell 路径
function getDefaultShell(): string {
    return vscode.workspace.getConfiguration('terminal').get('integrated.defaultProfile.windows') ||
        vscode.workspace.getConfiguration('terminal').get('integrated.shell.windows') ||
        'cmd.exe';
}

// 获取完整的 shell 路径
export function getShellPath(): string {
    const shell = getDefaultShell();
    // 根据 shell 名称返回完整路径
    switch (shell.toLowerCase()) {
        case 'powershell':
            return 'pwsh.exe';
        default:
            return shell; // 返回配置中的完整路径或名称
    }
}

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Dear Blog');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public info(message: string, data?: any): void {
        this.log('INFO', message, data);
    }

    public warn(message: string, data?: any): void {
        this.log('WARN', message, data);
    }

    public error(message: string, data?: any): void {
        this.log('ERROR', message, data);
    }

    private log(level: string, message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;

        this.outputChannel.appendLine(logMessage);

        if (data) {
            this.outputChannel.appendLine(JSON.stringify(data, null, 2));
        }
    }

    public show(): void {
        this.outputChannel.show();
    }

    public clear(): void {
        this.outputChannel.clear();
    }
}