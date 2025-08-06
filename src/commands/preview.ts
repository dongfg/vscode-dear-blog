import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';
import { getShellPath } from './helper';

// 存储预览服务器进程引用
let previewProcess: cp.ChildProcess | null = null;

/**
 * 切换预览状态（启动/停止）
 */
export async function previewHandler(): Promise<boolean> {
    // 检查是否已有预览进程在运行
    if (previewProcess) {
        // 停止预览服务器
        stopPreview();
        return true;
    }

    // 启动预览服务器
    return startPreview();
}

/**
 * 启动Hugo预览服务器
 */
async function startPreview(): Promise<boolean> {
    // 检查工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开博客项目文件夹');
        return false;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 检查Hugo是否安装
    try {
        cp.execSync('hugo version');
    } catch {
        vscode.window.showErrorMessage(
            '未检测到Hugo，请先安装并配置环境变量',
            '查看安装指南'
        ).then(selection => {
            if (selection === '查看安装指南') {
                vscode.env.openExternal(vscode.Uri.parse('https://gohugo.io/getting-started/installing/'));
            }
        });
        return false;
    }

    try {
        vscode.window.showInformationMessage('正在启动Hugo预览服务器...');

        // 构建命令（使用PowerShell在Windows上执行，确保环境正确）
        const command = os.platform() === 'win32'
            ? 'pwsh -NoProfile -Command "hugo serve -D -F"'
            : 'hugo serve -D -F';

        // 启动预览进程
        previewProcess = cp.exec(command, { cwd: workspaceRoot, shell: getShellPath() });

        // 输出预览服务器日志
        const outputChannel = vscode.window.createOutputChannel('Hugo 预览');
        previewProcess.stdout?.on('data', (data) => {
            outputChannel.append(data);
        });
        previewProcess.stderr?.on('data', (data) => {
            outputChannel.append(data);
        });

        // 进程退出时清理
        previewProcess.on('exit', () => {
            previewProcess = null;
            outputChannel.appendLine('预览服务器已停止');
        });

        // 显示输出面板
        outputChannel.show();

        // 提示用户
        setTimeout(() => {
            vscode.window.showInformationMessage(
                'Hugo预览服务器已启动',
                '打开预览',
                '关闭提示'
            ).then(selection => {
                if (selection === '打开预览') {
                    vscode.env.openExternal(vscode.Uri.parse('http://localhost:1313'));
                }
            });
        }, 2000);
        return true;
    } catch (error: any) {
        vscode.window.showErrorMessage(`启动预览失败: ${error.message}`);
        previewProcess = null;
        return false;
    }
}

/**
 * 停止Hugo预览服务器
 */
function stopPreview() {
    if (previewProcess) {
        // 终止预览进程
        previewProcess.kill();
        previewProcess = null;
        vscode.window.showInformationMessage('Hugo预览服务器已停止');
    }
}