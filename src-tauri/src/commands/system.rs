use tauri::command;
use std::env;
use std::path::PathBuf;

#[command]
pub fn get_system_language() -> String {
    // 获取系统语言环境变量
    let lang = env::var("LANG").unwrap_or_else(|_| {
        // Windows 系统尝试其他环境变量
        if cfg!(target_os = "windows") {
            env::var("SYSTEM_LOCALE")
                .or_else(|_| env::var("LOCALE"))
                .unwrap_or_else(|_| "en-US".to_string())
        } else {
            // macOS/Linux 系统
            env::var("LC_ALL")
                .or_else(|_| env::var("LC_MESSAGES"))
                .unwrap_or_else(|_| "en-US".to_string())
        }
    });

    // 根据系统语言返回应用语言代码
    if lang.starts_with("zh") || lang.contains("CN") || lang.contains("Hans") {
        "zh-CN".to_string()
    } else if lang.starts_with("en") {
        "en".to_string()
    } else {
        // 默认返回英文
        "en".to_string()
    }
}

#[command]
pub fn get_available_languages() -> Vec<String> {
    vec!["zh-CN".to_string(), "en".to_string()]
}

#[command]
pub fn set_install_language(language: String) -> Result<(), String> {
    // 保存安装时选择的语言到应用目录
    let mut path = PathBuf::new();
    if cfg!(target_os = "windows") {
        // Windows: 使用当前目录
        path.push("install-language.txt");
    } else {
        // macOS/Linux: 使用用户配置目录
        if let Some(home_dir) = dirs::home_dir() {
            path.push(home_dir);
            path.push(".github-star-manage");
        }
        path.push("install-language.txt");
    }
    
    // 确保目录存在
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    match std::fs::write(&path, language) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to save install language: {}", e)),
    }
}

#[command]
pub fn get_install_language() -> Option<String> {
    // 读取安装时选择的语言
    let mut path = PathBuf::new();
    if cfg!(target_os = "windows") {
        // Windows: 使用当前目录
        path.push("install-language.txt");
    } else {
        // macOS/Linux: 使用用户配置目录
        if let Some(home_dir) = dirs::home_dir() {
            path.push(home_dir);
            path.push(".github-star-manage");
        }
        path.push("install-language.txt");
    }
    
    match std::fs::read_to_string(&path) {
        Ok(content) => Some(content.trim().to_string()),
        Err(_) => None,
    }
}
