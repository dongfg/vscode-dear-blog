import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

export class BlogManagerProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private versionInfo = {
        gitInstalled: false,
        gitVersion: '未安装',
        hugoInstalled: false,
        hugoVersion: '未安装'
    };

    constructor(private readonly _extensionUri: vscode.Uri) {
        // 初始化时检测版本信息
        this.detectGitVersion();
        this.detectHugoVersion();
    }

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // 加载CSS样式
        const styleUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionUri, 'media', 'style.css'
        ));

        // 加载HTML模板并替换占位符
        webviewView.webview.html = this.getHtmlContent(webviewView.webview, styleUri);

        // 处理来自Webview的消息
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.command) {
                case 'newPost':
                    vscode.commands.executeCommand('dear-blog.newPost');
                    return;
                case 'publish':
                    vscode.commands.executeCommand('dear-blog.publish');
                    return;
                case 'preview':
                    await vscode.commands.executeCommand('dear-blog.preview');
                    this.togglePreviewStatus();
                    return;
                case 'requestVersionInfo':
                    // 发送版本信息到Webview
                    this.sendVersionInfo();
                    return;
            }
        });
    }

    // 更新预览状态并通知Webview
    public async togglePreviewStatus() {
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (this._view) {
            this._view.webview.postMessage({
                type: 'previewStatus'
            });
        }
    }

    // 发送版本信息到Webview
    private sendVersionInfo() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'versionInfo',
                ...this.versionInfo
            });
        }
    }

    // 检测Git版本
    private detectGitVersion() {
        exec('git --version', (error, stdout) => {
            if (!error) {
                // 从输出中提取版本号 (格式类似 "git version 2.34.1")
                const versionMatch = stdout.match(/git version (\d+\.\d+\.\d+)/);
                if (versionMatch && versionMatch[1]) {
                    this.versionInfo.gitInstalled = true;
                    this.versionInfo.gitVersion = versionMatch[1];
                }
            }
            this.sendVersionInfo();
        });
    }

    // 检测Hugo版本
    private detectHugoVersion() {
        exec('hugo version', (error, stdout) => {
            if (!error) {
                // 从输出中提取版本号 (格式类似 "hugo v0.101.0")
                const versionMatch = stdout.match(/hugo v(\d+\.\d+\.\d+)/);
                if (versionMatch && versionMatch[1]) {
                    this.versionInfo.hugoInstalled = true;
                    this.versionInfo.hugoVersion = versionMatch[1];
                }
            }
            this.sendVersionInfo();
        });
    }

    private getHtmlContent(webview: vscode.Webview, styleUri: vscode.Uri): string {
        // 读取HTML模板文件
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'panel.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // 替换模板中的占位符
        htmlContent = htmlContent.replace('{{styleUri}}', styleUri.toString());

        return htmlContent;
    }
}