import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdirAsync = promisify(fs.readdir);
const copyFileAsync = promisify(fs.copyFile);
const mkdirAsync = promisify(fs.mkdir);
const accessAsync = promisify(fs.access);

/**
 * 新建文章命令的处理函数
 * 逻辑：选择模板 → 输入文件夹名 → 创建文件夹 → 复制模板为index.md → 打开文件
 */
export async function newPostHandler() {
    // 检查是否有打开的工作区
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开博客项目文件夹');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 获取配置的路径
    const config = vscode.workspace.getConfiguration('dearBlog');
    const templateDirRelative = config.get<string>('templateDirectory', 'content/posts/_tpl');
    const postsDirRelative = config.get<string>('postsDirectory', 'content/posts');

    // 转换为绝对路径
    const templateDir = path.join(workspaceRoot, templateDirRelative);
    const postsDir = path.join(workspaceRoot, postsDirRelative);

    try {
        // 检查模板目录是否存在
        try {
            await accessAsync(templateDir, fs.constants.F_OK);
        } catch {
            vscode.window.showErrorMessage(`模板目录不存在: ${templateDir}\n请检查配置或创建该目录`);
            return;
        }

        // 读取模板目录中的所有md文件
        const files = await readdirAsync(templateDir);
        const mdTemplates = files
            .filter(file => file.toLowerCase().endsWith('.md'))
            .map(file => ({
                label: file,
                path: path.join(templateDir, file)
            }));

        // 检查是否有模板文件
        if (mdTemplates.length === 0) {
            vscode.window.showErrorMessage(`模板目录中未找到Markdown文件: ${templateDir}`);
            return;
        }

        // 让用户选择模板
        const selectedTemplate = await vscode.window.showQuickPick(
            mdTemplates.map(tpl => tpl.label),
            {
                title: '选择文章模板',
                placeHolder: '请选择一个模板文件'
            }
        );

        if (!selectedTemplate) {
            // 用户取消选择
            return;
        }

        // 获取选中模板的完整路径
        const templatePath = mdTemplates.find(tpl => tpl.label === selectedTemplate)?.path;
        if (!templatePath) {
            vscode.window.showErrorMessage('未找到选中的模板文件');
            return;
        }

        // 提示用户输入文件夹名称
        const folderName = await vscode.window.showInputBox({
            prompt: '请输入新文章的文件夹名称',
            placeHolder: '例如：my-first-post',
            validateInput: (value) => {
                if (!value.trim()) {
                    return '文件夹名称不能为空';
                }
                // 简单的文件名验证（避免特殊字符）
                if (/[\\/*?:"<>|]/.test(value)) {
                    return '名称中不能包含 \\ / * ? : " < > | 等特殊字符';
                }
                return null;
            }
        });

        if (!folderName) {
            // 用户取消输入
            return;
        }

        // 创建目标文件夹路径
        const targetFolder = path.join(postsDir, folderName.trim());
        const targetFile = path.join(targetFolder, 'index.md');

        // 检查文件夹是否已存在
        try {
            await accessAsync(targetFolder, fs.constants.F_OK);
            // 文件夹已存在，询问是否覆盖
            const overwrite = await vscode.window.showWarningMessage(
                `文件夹 "${folderName}" 已存在，是否覆盖其中的index.md？`,
                '覆盖',
                '取消'
            );

            if (overwrite !== '覆盖') {
                vscode.window.showInformationMessage('已取消创建');
                return;
            }
        } catch {
            // 文件夹不存在，创建它
            await mkdirAsync(targetFolder, { recursive: true });
        }

        // 复制模板文件到目标位置（index.md）
        await copyFileAsync(templatePath, targetFile);

        // 打开新创建的文件
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(targetFile));
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`文章已创建：${folderName}/index.md`);

    } catch (error: any) {
        vscode.window.showErrorMessage(`创建文章失败: ${error.message}`);
        console.error('新建文章错误:', error);
    }
}
