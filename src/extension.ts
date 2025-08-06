import * as vscode from 'vscode';
import { BlogManagerProvider } from './blogManagerProvider';
import { newPostHandler } from './commands/newPost';
import { previewHandler } from './commands/preview';
import { publishHandler } from './commands/publish';
import { Logger } from './commands/helper';

let panelProviders: BlogManagerProvider[] = [];
export function activate(context: vscode.ExtensionContext) {
	const logger = Logger.getInstance();
	// 注册Webview面板
	const provider = new BlogManagerProvider(context.extensionUri);
	panelProviders.push(provider);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'dear-blog.view',
			provider
		)
	);

	// 注册命令
	context.subscriptions.push(vscode.commands.registerCommand('dear-blog.newPost', newPostHandler));
	context.subscriptions.push(vscode.commands.registerCommand('dear-blog.preview', previewHandler));
	context.subscriptions.push(vscode.commands.registerCommand('dear-blog.publish', publishHandler));
	logger.show();
	logger.info("欢迎使用");
}


export function deactivate() { }
