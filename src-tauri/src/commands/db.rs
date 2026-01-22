use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

// ============================================================================
// 类型定义（与前端保持一致）
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StarItem {
    pub id: String,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub language: Option<String>,
    pub stargazers_count: i32,
    pub previous_stargazers_count: Option<i32>,
    pub tags: Vec<String>,
    pub groups: Vec<String>,
    pub notes: String,
    pub starred_at: String,
    pub pushed_at: Option<String>,
    pub last_release: Option<ReleaseInfo>,
    pub translated_description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub published_at: String,
    pub html_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncMetadata {
    pub last_sync: String,
    pub total_count: i32,
    pub synced_by: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiItem {
    pub id: String,
    pub name: String,
    pub api_type: String,
    pub api_key: Option<String>,
    pub api_url: Option<String>,
    pub model: Option<String>,
    pub tags: Vec<String>,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIModuleConfig {
    pub module: String,
    pub api_id: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GithubTokenInfo {
    pub token: String,
    pub created_at: String,
    pub expires_at: Option<String>,
    #[serde(default)]
    pub scopes: Vec<String>,
    pub username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StarData {
    pub stars: Vec<StarItem>,
    pub meta: SyncMetadata,
    pub groups: Vec<String>,
    pub tags: Vec<String>,
    #[serde(default)]
    pub group_order: HashMap<String, i32>,
}

#[derive(Debug, Deserialize)]
pub struct ClearOptions {
    #[serde(default)]
    pub star_data: bool,
    #[serde(default)]
    pub api_config: bool,
}

// ============================================================================
// 数据库状态管理
// ============================================================================

pub struct DbState {
    pool: Arc<Mutex<rusqlite::Connection>>,
}

impl DbState {
    pub fn new(conn: rusqlite::Connection) -> Self {
        Self {
            pool: Arc::new(Mutex::new(conn)),
        }
    }

    pub async fn execute<F, T>(&self, f: F) -> Result<T, String>
    where
        F: FnOnce(&mut rusqlite::Connection) -> Result<T, rusqlite::Error>,
    {
        let mut conn = self.pool.lock().await;
        f(&mut conn).map_err(|e| format!("Database error: {}", e))
    }
}

// ============================================================================
// 数据库初始化
// ============================================================================

pub fn init_database(app: &AppHandle) -> Result<(), String> {
    use tauri::Manager;
    
    // 优先将数据存放在可执行文件所在目录的 data 子目录，实现便携化
    // 若无法获取可执行目录，则回退到系统 AppData 目录
    let portable_data_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .map(|exe_dir| exe_dir.join("data"));

    let data_dir = match portable_data_dir {
        Some(dir) => dir,
        None => app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data dir: {}", e))?,
    };

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir: {}", e))?;

    let db_path = data_dir.join("github_star_manager.db");
    
    // 创建连接
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // 启用 WAL 模式
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("Failed to set WAL mode: {}", e))?;
    
    // 设置 busy_timeout (30秒)
    conn.pragma_update(None, "busy_timeout", 30000)
        .map_err(|e| format!("Failed to set busy_timeout: {}", e))?;
    
    // 创建表结构
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS stars (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            full_name TEXT NOT NULL,
            description TEXT,
            html_url TEXT NOT NULL,
            language TEXT,
            stargazers_count INTEGER NOT NULL DEFAULT 0,
            previous_stargazers_count INTEGER,
            tags TEXT NOT NULL DEFAULT '[]',
            groups TEXT NOT NULL DEFAULT '[]',
            notes TEXT NOT NULL DEFAULT '',
            starred_at TEXT NOT NULL,
            last_release_tag TEXT,
            last_release_published_at TEXT,
            last_release_html_url TEXT,
            translated_description TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS groups (
            name TEXT PRIMARY KEY,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tags (
            name TEXT PRIMARY KEY,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS api_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_type TEXT NOT NULL,
            api_key TEXT,
            api_url TEXT,
            model TEXT,
            tags TEXT,
            description TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_module_configs (
            module TEXT PRIMARY KEY,
            api_id TEXT,
            enabled INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (api_id) REFERENCES api_items(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_stars_full_name ON stars(full_name);
        CREATE INDEX IF NOT EXISTS idx_stars_language ON stars(language);
        CREATE INDEX IF NOT EXISTS idx_stars_starred_at ON stars(starred_at);
        "#,
    )
    .map_err(|e| format!("Failed to create tables: {}", e))?;
    
    // 将连接存储到应用状态
    app.manage(DbState::new(conn));
    
    Ok(())
}

// ============================================================================
// Star 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_stars(state: State<'_, DbState>) -> Result<Vec<StarItem>, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, full_name, description, html_url, language,
                        stargazers_count, previous_stargazers_count, tags, groups, notes, starred_at,
                        last_release_tag, last_release_published_at, last_release_html_url,
                        translated_description, updated_at
                 FROM stars ORDER BY starred_at DESC",
            )?;
            
            let stars = stmt
                .query_map([], |row| {
                    let tags_json: String = row.get("tags")?;
                    let groups_json: String = row.get("groups")?;
                    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
                    let groups: Vec<String> = serde_json::from_str(&groups_json).unwrap_or_default();

                    let last_release = match (
                        row.get::<_, Option<String>>("last_release_tag")?,
                        row.get::<_, Option<String>>("last_release_published_at")?,
                        row.get::<_, Option<String>>("last_release_html_url")?,
                    ) {
                        (Some(tag), Some(published), Some(url)) => Some(ReleaseInfo {
                            tag_name: tag,
                            published_at: published,
                            html_url: url,
                        }),
                        _ => None,
                    };

                    let id: String = row.get("id")?;
                    let name: String = row.get("name")?;
                    let full_name: String = row.get("full_name")?;
                    let description: Option<String> = row.get("description")?;
                    let html_url: String = row.get("html_url")?;
                    let language: Option<String> = row.get("language")?;
                    let stargazers_count: i32 = row.get("stargazers_count")?;
                    let previous_stargazers_count: Option<i32> = row.get("previous_stargazers_count")?;
                    let notes: String = row.get("notes")?;
                    let starred_at: String = row.get("starred_at")?;
                    let pushed_at: Option<String> = row.get("updated_at")?;
                    let translated_description: Option<String> = row.get("translated_description")?;

                    Ok(StarItem {
                        id,
                        name,
                        full_name,
                        description,
                        html_url,
                        language,
                        stargazers_count,
                        previous_stargazers_count,
                        tags,
                        groups,
                        notes,
                        starred_at,
                        pushed_at,
                        last_release,
                        translated_description,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;
            
            Ok(stars)
        })
        .await
}

#[tauri::command]
pub async fn save_star(star: StarItem, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            let tags_json = serde_json::to_string(&star.tags).unwrap_or_else(|_| "[]".to_string());
            let groups_json = serde_json::to_string(&star.groups).unwrap_or_else(|_| "[]".to_string());
            
            let (last_release_tag, last_release_published_at, last_release_html_url) =
                if let Some(release) = &star.last_release {
                    (
                        Some(release.tag_name.clone()),
                        Some(release.published_at.clone()),
                        Some(release.html_url.clone()),
                    )
                } else {
                    (None, None, None)
                };

            let repo_pushed_at = star
                .pushed_at
                .clone()
                .unwrap_or_else(|| star.starred_at.clone());
            
            conn.execute(
                r#"INSERT OR REPLACE INTO stars (
                    id, name, full_name, description, html_url, language, stargazers_count,
                    previous_stargazers_count,
                    tags, groups, notes, starred_at,
                    last_release_tag, last_release_published_at, last_release_html_url,
                    translated_description, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"#,
                rusqlite::params![
                    star.id,
                    star.name,
                    star.full_name,
                    star.description,
                    star.html_url,
                    star.language,
                    star.stargazers_count,
                    star.previous_stargazers_count,
                    tags_json,
                    groups_json,
                    star.notes,
                    star.starred_at,
                    last_release_tag,
                    last_release_published_at,
                    last_release_html_url,
                    star.translated_description,
                    repo_pushed_at,
                ],
            )?;
            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn save_stars_batch(stars: Vec<StarItem>,state: State<'_, DbState>,) -> Result<(), String> {
    state
        .execute(move |conn| {
            let tx = conn.transaction()?;
            
            for star in stars {
                let tags_json = serde_json::to_string(&star.tags).unwrap_or_else(|_| "[]".to_string());
                let groups_json = serde_json::to_string(&star.groups).unwrap_or_else(|_| "[]".to_string());
                
                let (last_release_tag, last_release_published_at, last_release_html_url) =
                    if let Some(release) = &star.last_release {
                        (
                            Some(release.tag_name.clone()),
                            Some(release.published_at.clone()),
                            Some(release.html_url.clone()),
                        )
                    } else {
                        (None, None, None)
                    };

                let repo_pushed_at = star
                    .pushed_at
                    .clone()
                    .unwrap_or_else(|| star.starred_at.clone());
                
                tx.execute(
                    r#"INSERT OR REPLACE INTO stars (
                        id, name, full_name, description, html_url, language, stargazers_count,
                        previous_stargazers_count,
                        tags, groups, notes, starred_at,
                        last_release_tag, last_release_published_at, last_release_html_url,
                        translated_description, updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"#,
                    rusqlite::params![
                        star.id,
                        star.name,
                        star.full_name,
                        star.description,
                        star.html_url,
                        star.language,
                        star.stargazers_count,
                        star.previous_stargazers_count,
                        tags_json,
                        groups_json,
                        star.notes,
                        star.starred_at,
                        last_release_tag,
                        last_release_published_at,
                        last_release_html_url,
                        star.translated_description,
                        repo_pushed_at,
                    ],
                )?;
            }
            
            tx.commit()?;
            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn delete_star(id: String, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            conn.execute("DELETE FROM stars WHERE id = ?1", [id])?;
            Ok(())
        })
        .await
}

// ============================================================================
// Metadata 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_metadata(state: State<'_, DbState>) -> Result<SyncMetadata, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare(
                "SELECT key, value FROM metadata WHERE key IN ('last_sync', 'total_count', 'synced_by')",
            )?;
            
            let mut last_sync = String::new();
            let mut total_count = 0;
            let mut synced_by = String::new();
            
            let rows = stmt.query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?;
            
            for row in rows {
                let (key, value) = row?;
                match key.as_str() {
                    "last_sync" => last_sync = value,
                    "total_count" => total_count = value.parse().unwrap_or(0),
                    "synced_by" => synced_by = value,
                    _ => {}
                }
            }
            
            Ok(SyncMetadata {
                last_sync,
                total_count,
                synced_by,
            })
        })
        .await
}

// ============================================================================
// GitHub Token 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_github_token(state: State<'_, DbState>) -> Result<Option<GithubTokenInfo>, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare("SELECT value FROM metadata WHERE key = 'github_token'")?;
            let result = stmt.query_row([], |row| row.get::<_, String>(0));

            match result {
                Ok(json) => {
                    let info: GithubTokenInfo = serde_json::from_str(&json)
                        .map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?;
                    Ok(Some(info))
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        })
        .await
}

#[tauri::command]
pub async fn save_github_token(info: GithubTokenInfo,state: State<'_, DbState>,) -> Result<(), String> {
    let json = serde_json::to_string(&info)
        .map_err(|e| format!("Failed to serialize token info: {}", e))?;

    state
        .execute(move |conn| {
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('github_token', ?1)",
                [json],
            )?;
            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn delete_github_token(state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(|conn| {
            conn.execute("DELETE FROM metadata WHERE key = 'github_token'", [])?;
            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn save_metadata(meta: SyncMetadata, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_sync', ?1)",
                [&meta.last_sync],
            )?;
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('total_count', ?1)",
                [meta.total_count.to_string()],
            )?;
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('synced_by', ?1)",
                [&meta.synced_by],
            )?;
            Ok(())
        })
        .await
}

// ============================================================================
// Groups 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_groups(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare("SELECT name FROM groups ORDER BY name")?;
            let groups = stmt
                .query_map([], |row| row.get(0))?
                .collect::<Result<Vec<String>, _>>()?;
            Ok(groups)
        })
        .await
}

#[tauri::command]
pub async fn save_groups(groups: Vec<String>, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            let tx = conn.transaction()?;
            tx.execute("DELETE FROM groups", [])?;
            
            for group in groups {
                tx.execute("INSERT INTO groups (name) VALUES (?1)", [group])?;
            }
            
            tx.commit()?;
            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn load_group_order(state: State<'_, DbState>,) -> Result<std::collections::HashMap<String, i32>, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare("SELECT value FROM metadata WHERE key = 'group_order'")?;
            let result = stmt.query_row([], |row| {
                let value: String = row.get(0)?;
                Ok(value)
            });
            
            match result {
                Ok(json) => {
                    let order: std::collections::HashMap<String, i32> =
                        serde_json::from_str(&json).unwrap_or_default();
                    Ok(order)
                }
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    Ok(std::collections::HashMap::new())
                }
                Err(e) => Err(e),
            }
        })
        .await
}

#[tauri::command]
pub async fn save_group_order(order: std::collections::HashMap<String, i32>,state: State<'_, DbState>,) -> Result<(), String> {
    state
        .execute(move |conn| {
            let json = serde_json::to_string(&order).unwrap_or_else(|_| "{}".to_string());
            conn.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('group_order', ?1)",
                [json],
            )?;
            Ok(())
        })
        .await
}

// ============================================================================
// Tags 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_tags(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare("SELECT name FROM tags ORDER BY name")?;
            let tags = stmt
                .query_map([], |row| row.get(0))?
                .collect::<Result<Vec<String>, _>>()?;
            Ok(tags)
        })
        .await
}

#[tauri::command]
pub async fn save_tags(tags: Vec<String>, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            let tx = conn.transaction()?;
            tx.execute("DELETE FROM tags", [])?;
            
            for tag in tags {
                tx.execute("INSERT INTO tags (name) VALUES (?1)", [tag])?;
            }
            
            tx.commit()?;
            Ok(())
        })
        .await
}

// ============================================================================
// API Items 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_api_items(state: State<'_, DbState>) -> Result<Vec<ApiItem>, String> {
    state
        .execute(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, name, api_type, api_key, api_url, model, tags, description, created_at, updated_at 
                 FROM api_items ORDER BY created_at DESC",
            )?;
            
            let items = stmt
                .query_map([], |row| {
                    let tags_json: Option<String> = row.get(6)?;
                    let tags: Vec<String> = tags_json
                        .and_then(|json| serde_json::from_str(&json).ok())
                        .unwrap_or_default();
                    
                    Ok(ApiItem {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        api_type: row.get(2)?,
                        api_key: row.get(3)?,
                        api_url: row.get(4)?,
                        model: row.get(5)?,
                        tags,
                        description: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;
            
            Ok(items)
        })
        .await
}

#[tauri::command]
pub async fn save_api_item(api: ApiItem, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            let tags_json = serde_json::to_string(&api.tags).ok();
            
            conn.execute(
                r#"INSERT INTO api_items 
                   (id, name, api_type, api_key, api_url, model, tags, description, created_at, updated_at)
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                   ON CONFLICT(id) DO UPDATE SET
                     name = excluded.name,
                     api_type = excluded.api_type,
                     api_key = excluded.api_key,
                     api_url = excluded.api_url,
                     model = excluded.model,
                     tags = excluded.tags,
                     description = excluded.description,
                     created_at = excluded.created_at,
                     updated_at = excluded.updated_at
                "#,
                rusqlite::params![
                    api.id,
                    api.name,
                    api.api_type,
                    api.api_key,
                    api.api_url,
                    api.model,
                    tags_json,
                    api.description,
                    api.created_at,
                    api.updated_at,
                ],
            )?;
            Ok(())
        })
        .await
}

#[tauri::command]
pub async fn delete_api_item(id: String, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            conn.execute("DELETE FROM api_items WHERE id = ?1", [id])?;
            Ok(())
        })
        .await
}

// ============================================================================
// AI Module Configs 相关命令
// ============================================================================

#[tauri::command]
pub async fn load_ai_module_configs(state: State<'_, DbState>,) -> Result<Vec<AIModuleConfig>, String> {
    state
        .execute(|conn| {
            let mut stmt =
                conn.prepare("SELECT module, api_id, enabled FROM ai_module_configs")?;
            
            let configs = stmt
                .query_map([], |row| {
                    Ok(AIModuleConfig {
                        module: row.get(0)?,
                        api_id: row.get(1)?,
                        enabled: row.get::<_, i32>(2)? != 0,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;
            
            Ok(configs)
        })
        .await
}

#[tauri::command]
pub async fn save_ai_module_config(config: AIModuleConfig,state: State<'_, DbState>,) -> Result<(), String> {
    state
        .execute(move |conn| {
            conn.execute(
                r#"INSERT OR REPLACE INTO ai_module_configs (module, api_id, enabled)
                   VALUES (?1, ?2, ?3)"#,
                rusqlite::params![config.module, config.api_id, if config.enabled { 1 } else { 0 }],
            )?;
            Ok(())
        })
        .await
}

// ============================================================================
// 数据管理命令
// ============================================================================

#[tauri::command]
pub async fn clear_data(options: ClearOptions, state: State<'_, DbState>) -> Result<(), String> {
    let ClearOptions {
        star_data,
        api_config,
    } = options;

    state
        .execute(move |conn| {
            let tx = conn.transaction()?;

            if star_data {
                tx.execute("DELETE FROM stars", [])?;
                tx.execute("DELETE FROM metadata", [])?;
                tx.execute("DELETE FROM groups", [])?;
                tx.execute("DELETE FROM tags", [])?;
            }

            if api_config {
                tx.execute("DELETE FROM ai_module_configs", [])?;
                tx.execute("DELETE FROM api_items", [])?;
            }

            tx.commit()?;
            Ok(())
        })
        .await
}


#[tauri::command]
pub async fn import_all_data(data: StarData, state: State<'_, DbState>) -> Result<(), String> {
    state
        .execute(move |conn| {
            let tx = conn.transaction()?;

            let StarData {
                stars,
                meta,
                groups,
                tags,
                group_order,
            } = data;

            tx.execute("DELETE FROM stars", [])?;
            tx.execute("DELETE FROM metadata", [])?;
            tx.execute("DELETE FROM groups", [])?;
            tx.execute("DELETE FROM tags", [])?;

            for star in stars {
                let tags_json = serde_json::to_string(&star.tags).unwrap_or_else(|_| "[]".to_string());
                let groups_json = serde_json::to_string(&star.groups).unwrap_or_else(|_| "[]".to_string());

                let (last_release_tag, last_release_published_at, last_release_html_url) =
                    if let Some(release) = &star.last_release {
                        (
                            Some(release.tag_name.clone()),
                            Some(release.published_at.clone()),
                            Some(release.html_url.clone()),
                        )
                    } else {
                        (None, None, None)
                    };

                let repo_pushed_at = star
                    .pushed_at
                    .clone()
                    .unwrap_or_else(|| star.starred_at.clone());

                tx.execute(
                    r#"INSERT OR REPLACE INTO stars (
                        id, name, full_name, description, html_url, language, stargazers_count,
                        tags, groups, notes, starred_at,
                        last_release_tag, last_release_published_at, last_release_html_url,
                        translated_description, updated_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)"#,
                    rusqlite::params![
                        star.id,
                        star.name,
                        star.full_name,
                        star.description,
                        star.html_url,
                        star.language,
                        star.stargazers_count,
                        tags_json,
                        groups_json,
                        star.notes,
                        star.starred_at,
                        last_release_tag,
                        last_release_published_at,
                        last_release_html_url,
                        star.translated_description,
                        repo_pushed_at,
                    ],
                )?;
            }

            tx.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_sync', ?1)",
                [&meta.last_sync],
            )?;
            tx.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('total_count', ?1)",
                [meta.total_count.to_string()],
            )?;
            tx.execute(
                "INSERT OR REPLACE INTO metadata (key, value) VALUES ('synced_by', ?1)",
                [&meta.synced_by],
            )?;

            if !group_order.is_empty() {
                let json = serde_json::to_string(&group_order).unwrap_or_else(|_| "{}".to_string());
                tx.execute(
                    "INSERT OR REPLACE INTO metadata (key, value) VALUES ('group_order', ?1)",
                    [json],
                )?;
            }

            for group in groups {
                tx.execute("INSERT OR IGNORE INTO groups (name) VALUES (?1)", [group])?;
            }

            for tag in tags {
                tx.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", [tag])?;
            }

            tx.commit()?;
            Ok(())
        })
        .await
}
