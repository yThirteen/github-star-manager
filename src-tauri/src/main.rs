// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::github::*;
use commands::ai::*;
use commands::db::*;
use commands::system::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 初始化数据库
            init_database(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 系统相关
            get_system_language,
            get_available_languages,
            set_install_language,
            get_install_language,
            // GitHub 相关
            fetch_stars,
            fetch_release,
            open_url,
            verify_github_token,
            // AI 相关
            translate_text,
            classify_repository,
            classify_groups_hierarchy,
            list_provider_models,
            // 数据库 - Stars
            load_stars,
            save_star,
            save_stars_batch,
            delete_star,
            clear_data,
            import_all_data,
            // 数据库 - Metadata
            load_metadata,
            save_metadata,
            load_github_token,
            save_github_token,
            delete_github_token,
            // 数据库 - Groups
            load_groups,
            save_groups,
            load_group_order,
            save_group_order,
            // 数据库 - Tags
            load_tags,
            save_tags,
            // 数据库 - API Items
            load_api_items,
            save_api_item,
            delete_api_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

