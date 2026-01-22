use octocrab::Octocrab;
use serde::{Deserialize, Serialize};

/// 打开 URL（备用方案）
#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StarItem {
    pub id: i64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub language: Option<String>,
    pub stargazers_count: i32,
    pub pushed_at: String,
    pub starred_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReleaseItem {
    pub tag_name: String,
    pub published_at: String,
    pub html_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenVerificationResult {
    pub valid: bool,
    pub username: Option<String>,
    pub scopes: Vec<String>,
    pub message: Option<String>,
}

/// 获取用户的 GitHub Stars 列表
#[tauri::command]
pub async fn fetch_stars(token: String) -> Result<Vec<StarItem>, String> {
    // 获取当前认证用户（用于验证 token）
    let octocrab = Octocrab::builder()
        .personal_token(token.clone())
        .build()
        .map_err(|e| format!("Failed to create Octocrab client: {}", e))?;

    let _user = octocrab
        .current()
        .user()
        .await
        .map_err(|e| format!("Failed to get current user: {}", e))?;

    // 获取用户的 starred repositories
    // 直接使用 HTTP 请求调用 GitHub API
    let mut all_stars = Vec::new();
    let mut page = 1u32;
    let per_page = 100u8;

    let client = reqwest::Client::new();

    loop {
        let url = format!(
            "https://api.github.com/user/starred?per_page={}&page={}",
            per_page, page
        );
        
        let response = client
            .get(&url)
            // 使用 Bearer 提高对细粒度 PAT 的兼容性
            .header("Authorization", format!("Bearer {}", token))
            .header("User-Agent", "github-star-manage")
            .header("Accept", "application/vnd.github.v3.star+json")
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 403 {
                return Err("GitHub API 速率限制，请稍后重试".to_string());
            }
            return Err(format!("GitHub API error: {}", status));
        }

        let repos: Vec<serde_json::Value> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        if repos.is_empty() {
            break;
        }

        let items: Vec<StarItem> = repos
            .iter()
            .map(|repo| {
                let repo_data = &repo["repo"];
                StarItem {
                    id: repo_data["id"].as_i64().unwrap_or(0),
                    name: repo_data["name"].as_str().unwrap_or("").to_string(),
                    full_name: repo_data["full_name"].as_str().unwrap_or("").to_string(),
                    description: repo_data["description"].as_str().map(|s| s.to_string()),
                    html_url: repo_data["html_url"].as_str().unwrap_or("").to_string(),
                    language: repo_data["language"].as_str().map(|s| s.to_string()),
                    stargazers_count: repo_data["stargazers_count"].as_i64().unwrap_or(0) as i32,
                    pushed_at: repo_data["pushed_at"].as_str().unwrap_or("").to_string(),
                    starred_at: repo["starred_at"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                }
            })
            .collect();

        all_stars.extend(items);

        // 如果返回的数据少于 per_page，说明已经是最后一页
        if repos.len() < per_page as usize {
            break;
        }

        page += 1;
    }

    Ok(all_stars)
}

/// 获取仓库的最新 Release
#[tauri::command]
pub async fn fetch_release(
    owner: String,
    repo: String,
    token: String,
) -> Result<Option<ReleaseItem>, String> {
    let octocrab = Octocrab::builder()
        .personal_token(token)
        .build()
        .map_err(|e| format!("Failed to create Octocrab client: {}", e))?;

    let release = octocrab
        .repos(&owner, &repo)
        .releases()
        .get_latest()
        .await;

    match release {
        Ok(latest_release) => Ok(Some(ReleaseItem {
            tag_name: latest_release.tag_name,
            published_at: latest_release
                .published_at
                .map(|d| d.to_rfc3339())
                .unwrap_or_default(),
            html_url: latest_release.html_url.to_string(),
        })),
        Err(octocrab::Error::GitHub { .. }) => {
            // 404 或其他 GitHub 错误，可能是没有 release
            Ok(None)
        }
        Err(e) => Err(format!("Failed to fetch release: {}", e)),
    }
}

/// 验证 GitHub Token
#[tauri::command]
pub async fn verify_github_token(token: String) -> Result<TokenVerificationResult, String> {
    if token.trim().is_empty() {
        return Ok(TokenVerificationResult {
            valid: false,
            username: None,
            scopes: Vec::new(),
            message: Some("Token 为空".to_string()),
        });
    }

    let client = reqwest::Client::new();

    let response = client
        .get("https://api.github.com/user")
        // 使用 Bearer 提高对细粒度 PAT 的兼容性
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "github-star-manage")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("验证请求失败: {}", e))?;

    let status = response.status();
    let headers = response.headers().clone();

    if status.as_u16() == 401 {
        return Ok(TokenVerificationResult {
            valid: false,
            username: None,
            scopes: Vec::new(),
            message: Some("Token 无效或已过期".to_string()),
        });
    }

    if !status.is_success() {
        return Err(format!("验证失败: {}", status));
    }

    let user: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析用户信息失败: {}", e))?;

    let scopes = headers
        .get("X-OAuth-Scopes")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .split(',')
        .map(|scope| scope.trim().to_string())
        .filter(|scope| !scope.is_empty())
        .collect::<Vec<_>>();

    Ok(TokenVerificationResult {
        valid: true,
        username: user["login"].as_str().map(|s| s.to_string()),
        scopes,
        message: None,
    })
}

