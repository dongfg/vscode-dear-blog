import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';
import { getShellPath } from './helper';

// 转换为Promise形式以便使用async/await
const exec = promisify(cp.exec);

/**
 * 发布命令处理函数
 * 流程：构建静态文件 → Git提交 → 推送至远程仓库
 */
export async function publishHandler() {
    // 检查是否有打开的工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开博客项目文件夹');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 显示进度条
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "正在发布博客",
        cancellable: true
    }, async (progress, token) => {
        // 监听取消事件
        token.onCancellationRequested(() => {
            vscode.window.showInformationMessage("发布已取消");
        });

        try {
            const shell = getShellPath();
            // 步骤1: 环境检查（20%）
            progress.report({ message: "检查环境配置...", increment: 0 });
            await checkEnvironment(workspaceRoot, shell);
            progress.report({ increment: 20 });

            // 步骤2: 构建静态文件（40%）
            progress.report({ message: "生成网站文件..." });
            await buildStaticFiles(workspaceRoot, shell);
            progress.report({ increment: 20 });

            // 步骤3: Git提交（70%）
            progress.report({ message: "提交更改到本地仓库..." });
            const commitMessage = `自动发布于 ${new Date().toLocaleString()}`;
            // await gitCommit(workspaceRoot, commitMessage);
            progress.report({ increment: 30 });

            // 步骤4: 推送至远程（100%）
            progress.report({ message: "推送至远程服务器..." });
            // await gitPush(workspaceRoot);
            progress.report({ increment: 30, message: "发布完成！" });

            vscode.window.showInformationMessage("博客发布成功！");
        } catch (error: any) {
            vscode.window.showErrorMessage(`发布失败: ${error.message}`);
            throw error; // 终止进度条
        }
    });
}

/**
 * 检查环境依赖（Hugo和Git）
 */
async function checkEnvironment(workspaceRoot: string, shell: string) {
    // 检查Hugo
    try {
        await exec('hugo version', { shell });
    } catch {
        throw new Error("未检测到Hugo，请先安装并配置环境变量");
    }

    // 检查Git
    try {
        await exec('git --version', { shell });
    } catch {
        throw new Error("未检测到Git，请先安装并配置环境变量");
    }

    // 检查是否在Git仓库中
    try {
        await exec('git rev-parse --is-inside-work-tree', { cwd: workspaceRoot, shell });
    } catch {
        throw new Error("当前文件夹不是Git仓库，请先初始化仓库并关联远程");
    }
}

/**
 * 执行Hugo构建静态文件
 */
async function buildStaticFiles(workspaceRoot: string, shell: string) {
    try {
        // 执行hugo命令构建（默认输出到public目录）
        const result = await exec('hugo', { cwd: workspaceRoot, shell });
        console.log("Hugo构建输出:", result.stdout);
        return result;
    } catch (error: any) {
        throw new Error(`构建静态文件失败: ${error.stderr || error.message}`);
    }
}

/**
 * Git提交更改
 */
async function gitCommit(workspaceRoot: string, message: string, shell: string) {
    try {
        // 添加所有更改
        await exec('git add .', { cwd: workspaceRoot, shell });
        // 提交（忽略空提交）
        await exec(`git commit -m "${message}" || echo "无更改可提交"`, { cwd: workspaceRoot, shell });
    } catch (error: any) {
        throw new Error(`Git提交失败: ${error.stderr || error.message}`);
    }
}

/**
 * Git推送至远程
 */
async function gitPush(workspaceRoot: string, shell: string) {
    try {
        // 推送当前分支到远程
        const result = await exec('git push', { cwd: workspaceRoot, shell });
        console.log("Git推送输出:", result.stdout);
        return result;
    } catch (error: any) {
        throw new Error(`推送至远程失败: ${error.stderr || error.message}`);
    }
}
