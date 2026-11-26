/**
 * AI 功能命令模块
 * 提供翻译、分类、分组层级归纳功能
 *
 * 支持 4 种 API 协议（api_type 在数据库里以小写 TEXT 存储）：
 * - openai    ：OpenAI 兼容（DeepSeek、SiliconFlow、vLLM、通义/智谱兼容端点）
 * - anthropic ：Anthropic Messages（Claude）
 * - gemini    ：Google Gemini（AI Studio）
 * - ollama    ：Ollama 本地 / 自托管
 *
 * 这一层的关键约定：
 * - 所有请求复用同一个带超时的 reqwest 客户端（原先每次调用都新建 Client：没有超时、
 *   连接无法复用，服务端卡住时前端会一直转圈）；
 * - 429 / 5xx 自动重试（指数退避 + Retry-After + 抖动），其余错误直接带原因抛给前端；
 * - 提示词拆成 system（规则）和 user（数据）两条消息，避免模型把指令当成待处理文本；
 * - 错误信息只保留服务端给出的原因（截断），不再把整个响应体或提示词塞进界面，
 *   也不把 API Key 写进任何错误文案（Gemini 的 Key 走请求头而不是 URL query）。
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// 分类时截断仓库描述的长度（字符数）
const MAX_DESC_LEN_FOR_CLASSIFY: usize = 500;
/// 单次翻译的最大文本长度（字符数）
const MAX_TEXT_LEN_FOR_TRANSLATE: usize = 8000;
/// 单次请求总超时
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);
/// 建连超时
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
/// 最多尝试次数（含首次）
const MAX_ATTEMPTS: u32 = 3;
/// 错误信息里保留的服务端响应长度（字符数）
const MAX_ERROR_BODY_CHARS: usize = 300;
/// 分组层级归纳的批大小（过大容易触发输出截断）
const HIERARCHY_CHUNK_SIZE: usize = 30;
/// 分组层级归纳的输出上限
const HIERARCHY_MAX_TOKENS: u32 = 1024;
/// Anthropic 的 max_tokens 是必填项，调用方没给时用这个默认值
const DEFAULT_ANTHROPIC_MAX_TOKENS: u32 = 2048;
/// Anthropic 的接口版本头（缺失会直接 400）
const ANTHROPIC_VERSION: &str = "2023-06-01";

static HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn http_client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .timeout(REQUEST_TIMEOUT)
            .user_agent(concat!("github-star-manager/", env!("CARGO_PKG_VERSION")))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

// ============================================================================
// 协议
// ============================================================================

/// 供应商 API 协议
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum Protocol {
    /// OpenAI 兼容的 /chat/completions
    OpenAi,
    /// Anthropic Messages
    Anthropic,
    /// Google Gemini（AI Studio）
    Gemini,
    /// Ollama 本地 / 自托管
    Ollama,
}

impl Protocol {
    /// 把数据库里的 api_type 文本解析成协议。
    ///
    /// 大小写不敏感（历史数据里可能出现 `OpenAI`），空串按「未指定」处理。
    fn from_api_type(raw: Option<&str>) -> Result<Protocol, String> {
        let raw = raw.map(str::trim).unwrap_or("");
        if raw.is_empty() {
            return Err("未指定 API 协议 (api_type 为空)".to_string());
        }

        match raw.to_ascii_lowercase().as_str() {
            "openai" => Ok(Protocol::OpenAi),
            "anthropic" => Ok(Protocol::Anthropic),
            "gemini" => Ok(Protocol::Gemini),
            "ollama" => Ok(Protocol::Ollama),
            other => Err(format!("不支持的 API 协议: {}", other)),
        }
    }
}

// ============================================================================
// 请求构造与响应解析（纯函数，便于单测）
// ============================================================================

/// 一次协议请求需要的一切：地址、头部、JSON body
#[derive(Debug)]
struct ProtocolRequest {
    url: String,
    headers: Vec<(&'static str, String)>,
    body: serde_json::Value,
}

/// OpenAI 兼容接口的一条消息
#[derive(Serialize)]
struct ChatMessage {
    role: &'static str,
    content: String,
}

impl ChatMessage {
    fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system",
            content: content.into(),
        }
    }

    fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user",
            content: content.into(),
        }
    }
}

/// 把 ChatMessage 序列化成 JSON；anthropic / gemini 的 role 取值不同，需要重映射
fn messages_to_json(
    messages: &[ChatMessage],
    system_role: Option<&str>,
    assistant_role: &str,
) -> Vec<serde_json::Value> {
    messages
        .iter()
        .filter(|message| system_role.map_or(true, |system| message.role != system))
        .map(|message| {
            let role = if message.role == "assistant" {
                assistant_role
            } else {
                message.role
            };
            serde_json::json!({ "role": role, "content": message.content })
        })
        .collect()
}

/// 取出 system 消息（anthropic / gemini 要求它离开 messages 放到顶层）
fn take_system_prompt(messages: &[ChatMessage]) -> Option<String> {
    messages
        .iter()
        .find(|message| message.role == "system")
        .map(|message| message.content.trim().to_string())
        .filter(|content| !content.is_empty())
}

/// 按协议构造一次 chat 请求。只对 openai 使用 json_mode（其它协议忽略它）。
fn build_chat_request(
    protocol: Protocol,
    api_key: &str,
    api_url: &str,
    model: &str,
    messages: &[ChatMessage],
    temperature: f32,
    max_tokens: Option<u32>,
    json_mode: bool,
) -> Result<ProtocolRequest, String> {
    let json_headers = || vec![("Content-Type", "application/json".to_string())];

    match protocol {
        Protocol::OpenAi => {
            let mut body = serde_json::json!({
                "model": model,
                "messages": messages,
                "temperature": temperature,
            });
            if let Some(max_tokens) = max_tokens {
                body["max_tokens"] = serde_json::json!(max_tokens);
            }
            if json_mode {
                body["response_format"] = serde_json::json!({ "type": "json_object" });
            }

            Ok(ProtocolRequest {
                url: normalize_chat_completions_url(api_url)?,
                headers: vec![
                    ("Authorization", format!("Bearer {}", api_key)),
                    ("Content-Type", "application/json".to_string()),
                ],
                body,
            })
        }
        Protocol::Anthropic => {
            let mut body = serde_json::json!({
                "model": model,
                // max_tokens 是 Anthropic 的必填字段，缺失会直接 400
                "max_tokens": max_tokens.unwrap_or(DEFAULT_ANTHROPIC_MAX_TOKENS),
                "messages": messages_to_json(messages, Some("system"), "assistant"),
                "temperature": temperature,
            });
            if let Some(system) = take_system_prompt(messages) {
                body["system"] = serde_json::json!(system);
            }

            Ok(ProtocolRequest {
                url: normalize_anthropic_url(api_url)?,
                headers: vec![
                    ("x-api-key", api_key.to_string()),
                    ("anthropic-version", ANTHROPIC_VERSION.to_string()),
                    ("Content-Type", "application/json".to_string()),
                ],
                body,
            })
        }
        Protocol::Gemini => {
            let mut contents: Vec<serde_json::Value> = messages
                .iter()
                .filter(|message| message.role != "system")
                .map(|message| {
                    // Gemini 里助手角色叫 model，不是 assistant
                    let role = if message.role == "assistant" {
                        "model"
                    } else {
                        message.role
                    };
                    serde_json::json!({
                        "role": role,
                        "parts": [{ "text": message.content }],
                    })
                })
                .collect();
            if contents.is_empty() {
                contents.push(serde_json::json!({
                    "role": "user",
                    "parts": [{ "text": "" }],
                }));
            }

            let mut generation_config = serde_json::json!({
                "temperature": temperature,
            });
            if let Some(max_tokens) = max_tokens {
                generation_config["maxOutputTokens"] = serde_json::json!(max_tokens);
            }

            let mut body = serde_json::json!({
                "contents": contents,
                "generationConfig": generation_config,
            });
            if let Some(system) = take_system_prompt(messages) {
                body["systemInstruction"] = serde_json::json!({ "parts": [{ "text": system }] });
            }

            Ok(ProtocolRequest {
                // Key 放在 x-goog-api-key 头里，不要拼进 query，避免出现在日志/错误信息中
                url: normalize_gemini_url(api_url, model)?,
                headers: vec![
                    ("x-goog-api-key", api_key.to_string()),
                    ("Content-Type", "application/json".to_string()),
                ],
                body,
            })
        }
        Protocol::Ollama => {
            let mut options = serde_json::json!({
                "temperature": temperature,
            });
            if let Some(max_tokens) = max_tokens {
                options["num_predict"] = serde_json::json!(max_tokens);
            }

            let mut body = serde_json::json!({
                "model": model,
                "messages": messages_to_json(messages, None, "assistant"),
                "stream": false,
                "options": options,
            });
            if json_mode {
                body["format"] = serde_json::json!("json");
            }

            let mut headers = json_headers();
            // 本地 Ollama 不需要 Key；带鉴权的自托管网关仍然发 Bearer
            if !api_key.is_empty() {
                headers.push(("Authorization", format!("Bearer {}", api_key)));
            }

            Ok(ProtocolRequest {
                url: normalize_ollama_url(api_url)?,
                headers,
                body,
            })
        }
    }
}

/// 把 chat 响应里取出的原文收敛成最终内容（去引号 + 空内容报错）
fn finish_content(raw: &str) -> Result<String, String> {
    if raw.trim().is_empty() {
        return Err("AI 返回了空内容".to_string());
    }
    Ok(strip_wrapping_quotes(raw))
}

/// 从各协议的响应体里取出文本内容；截断（达到输出上限）时报错
fn extract_protocol_content(
    protocol: Protocol,
    json: &serde_json::Value,
) -> Result<String, String> {
    // 个别兼容实现会在 200 里塞 error 对象
    if let Some(error) = json.get("error") {
        return Err(format!(
            "AI 服务返回错误: {}",
            extract_api_error(&error.to_string())
        ));
    }

    match protocol {
        Protocol::OpenAi => {
            let choice = json
                .get("choices")
                .and_then(|choices| choices.as_array())
                .and_then(|choices| choices.first())
                .ok_or_else(|| "无法从 AI 响应中取出内容（缺少 choices[0]）".to_string())?;

            if choice.get("finish_reason").and_then(|v| v.as_str()) == Some("length") {
                return Err(truncation_message());
            }

            let content = choice
                .get("message")
                .and_then(|message| message.get("content"))
                .and_then(|content| content.as_str())
                .ok_or_else(|| {
                    "无法从 AI 响应中取出内容（缺少 choices[0].message.content）".to_string()
                })?;

            finish_content(content)
        }
        Protocol::Anthropic => {
            let blocks = json
                .get("content")
                .and_then(|content| content.as_array())
                .ok_or_else(|| {
                    "无法从 AI 响应中取出内容（缺少 content 数组）".to_string()
                })?;

            // 截断判定优先于内容拼接：被截断的响应本身就是半截内容
            if json.get("stop_reason").and_then(|v| v.as_str()) == Some("max_tokens") {
                return Err(truncation_message());
            }

            let mut out = String::new();
            for block in blocks {
                if let Some(text) = block.get("text").and_then(|text| text.as_str()) {
                    out.push_str(text);
                }
            }

            finish_content(&out)
        }
        Protocol::Gemini => {
            let candidate = json
                .get("candidates")
                .and_then(|candidates| candidates.as_array())
                .and_then(|candidates| candidates.first())
                .ok_or_else(|| {
                    "无法从 AI 响应中取出内容（缺少 candidates[0]）".to_string()
                })?;

            if candidate.get("finishReason").and_then(|v| v.as_str()) == Some("MAX_TOKENS") {
                return Err(truncation_message());
            }

            let mut out = String::new();
            if let Some(parts) = candidate
                .get("content")
                .and_then(|content| content.get("parts"))
                .and_then(|parts| parts.as_array())
            {
                for part in parts {
                    if let Some(text) = part.get("text").and_then(|text| text.as_str()) {
                        out.push_str(text);
                    }
                }
            }

            finish_content(&out)
        }
        Protocol::Ollama => {
            let message = json.get("message").ok_or_else(|| {
                "无法从 AI 响应中取出内容（缺少 message.content）".to_string()
            })?;

            if json.get("done_reason").and_then(|v| v.as_str()) == Some("length") {
                return Err(truncation_message());
            }

            let content = message
                .get("content")
                .and_then(|content| content.as_str())
                .ok_or_else(|| {
                    "无法从 AI 响应中取出内容（缺少 message.content）".to_string()
                })?;

            finish_content(content)
        }
    }
}

fn truncation_message() -> String {
    "AI 响应被截断（达到 max_tokens 上限），请减少批量或换用输出上限更大的模型".to_string()
}

// ============================================================================
// URL 归一化
// ============================================================================

fn truncate_chars(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max).collect();
    out.push('…');
    out
}

fn require(value: Option<String>, message: &str) -> Result<String, String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| message.to_string())
}

/// 语言代码 → 语言名称（写进提示词用）
fn language_name(code: &str) -> &'static str {
    match code {
        "zh" => "中文",
        "en" => "英文",
        "ja" => "日文",
        "ko" => "韩文",
        "fr" => "法文",
        "de" => "德文",
        "es" => "西班牙文",
        "ru" => "俄文",
        "pt" => "葡萄牙文",
        _ => "目标语言",
    }
}

/// 解析 URL 并校验 scheme；通过时返回去掉尾部 `/` 的完整 URL 字符串
fn check_http_url(trimmed: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(trimmed)
        .map_err(|e| format!("API URL 格式不正确（{}）：{}", trimmed, e))?;

    match url.scheme() {
        "http" | "https" => Ok(url),
        other => Err(format!(
            "API URL 必须使用 http/https，当前协议是 {}",
            other
        )),
    }
}

/// 把相对路径拼到 URL 的 path 上，并且**保留已有 query**——query 里可能带着网关
/// 需要的参数，不能被归一化顺手丢掉。
///
/// 已经带过该路径的写法（`.../v1/messages`）只做清理，不会重复拼成 `/v1/v1/messages`。
fn join_path(url: &reqwest::Url, relative: &str) -> Result<String, String> {
    let relative = relative.trim_matches('/');
    let path = url.path().trim_end_matches('/');
    let relative_path = format!("/{}", relative);

    let joined = if relative.is_empty() {
        path.to_string()
    } else if path == relative_path || path.ends_with(&relative_path) {
        // 地址里已经写全了端点，保持原样
        path.to_string()
    } else if relative_path.starts_with(&format!("{}/", path)) {
        // 用户只填到前缀（`/v1`），端点本身已经包含这段（`/v1/messages`）
        relative_path.clone()
    } else {
        format!("{}{}", path, relative_path)
    };

    let mut joined_url = url
        .join(&joined)
        .map_err(|e| format!("API URL 格式不正确：{}", e))?;
    joined_url.set_query(url.query());
    Ok(joined_url.to_string())
}

/// 把某协议的固定端点补到用户填的 base 上，已经带该端点就保持原样。
///
/// `endpoint` 是不带前导 `/` 的路径（例如 `v1/messages`），这样 `/v1`、`/v1/`
/// 这类写法都能落到正确位置。
fn with_endpoint(raw: &str, endpoint: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("请提供 API URL".to_string());
    }

    let url = check_http_url(trimmed)?;
    join_path(&url, endpoint)
}

/// 校验并补全 OpenAI 兼容的 chat/completions 地址（只有 openai 协议用这个）
///
/// 用户可以只填服务根地址（例如 `https://api.deepseek.com`），这里自动补成
/// `https://api.deepseek.com/v1/chat/completions`，避免「配置看起来对、请求却 404」。
fn normalize_chat_completions_url(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("请提供 API URL".to_string());
    }

    let mut url = check_http_url(trimmed)?;

    let path = url.path().trim_end_matches('/').to_string();
    let normalized = if path.is_empty() {
        "/v1/chat/completions".to_string()
    } else if path.ends_with("/chat/completions") {
        path
    } else if path.ends_with("/v1") || path.ends_with("/v1beta") || path.ends_with("/openai") {
        format!("{}/chat/completions", path)
    } else {
        // 用户已经写了自定义路径，保持原样
        path
    };

    if normalized != url.path() {
        url.set_path(&normalized);
    }

    Ok(url.to_string())
}

/// Anthropic Messages：`{base}/v1/messages`
fn normalize_anthropic_url(raw: &str) -> Result<String, String> {
    with_endpoint(raw, "v1/messages")
}

/// Ollama：`{base}/api/chat`（用户只填 `http://localhost:11434` 时自动补上）
fn normalize_ollama_url(raw: &str) -> Result<String, String> {
    with_endpoint(raw, "api/chat")
}

/// Gemini：`{base}/v1beta/models/{model}:generateContent`
///
/// `.../v1beta`、`.../v1beta/models`、已经写全的 `...:generateContent` 都能正确归一化，
/// 不会拼出 `/v1beta/v1beta` 这种地址。
fn normalize_gemini_url(raw: &str, model: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("请提供 API URL".to_string());
    }

    let url = check_http_url(trimmed)?;
    let path = url.path().trim_end_matches('/');
    if path.ends_with(":generateContent") {
        return Ok(url.to_string());
    }

    let endpoint = format!("v1beta/models/{}:generateContent", model);
    // 用户可能填到 `/v1beta` 或 `/v1beta/models` 为止；注意 strip_suffix 在整段匹配时
    // 返回的是空串而不是 None，所以这里显式判断「有没有前缀段」
    let prefix = if let Some(rest) = path.strip_suffix("/v1beta/models") {
        rest
    } else if let Some(rest) = path.strip_suffix("/v1beta") {
        rest
    } else {
        path
    };
    let prefix = prefix.trim_end_matches('/').trim_start_matches('/');
    let endpoint = if prefix.is_empty() {
        endpoint
    } else {
        format!("{}/{}", prefix, endpoint)
    };

    with_endpoint(trimmed, &endpoint)
}

// ============================================================================
// 错误解析 / 重试策略
// ============================================================================

/// 从各家形态不一的错误响应里挖出一句人能看懂的原因
fn extract_api_error(body: &str) -> String {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return "服务端没有返回错误详情".to_string();
    }

    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        let message = value
            .get("error")
            .and_then(|error| {
                error
                    .get("message")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string())
                    .or_else(|| error.as_str().map(|s| s.to_string()))
            })
            .or_else(|| {
                value
                    .get("message")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string())
            })
            .or_else(|| {
                value
                    .get("detail")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string())
            });
        if let Some(message) = message {
            return truncate_chars(message.trim(), MAX_ERROR_BODY_CHARS);
        }
    }

    truncate_chars(trimmed, MAX_ERROR_BODY_CHARS)
}

fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error()
}

fn retry_after_secs(response: &reqwest::Response) -> Option<u64> {
    response
        .headers()
        .get(reqwest::header::RETRY_AFTER)?
        .to_str()
        .ok()?
        .trim()
        .parse::<u64>()
        .ok()
}

/// 指数退避 + 抖动；服务端给了 Retry-After 就听它的（上限 8 秒）
fn backoff_delay(attempt: u32, retry_after: Option<u64>) -> Duration {
    let seconds = retry_after.unwrap_or(1u64 << attempt.min(3)).min(8);
    let jitter_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| u64::from(elapsed.subsec_millis()) % 250)
        .unwrap_or(0);
    Duration::from_millis(seconds * 1000 + jitter_ms)
}

fn strip_wrapping_quotes(text: &str) -> String {
    text.trim()
        .trim_matches(|c: char| matches!(c, '"' | '\'' | '`' | '“' | '”'))
        .trim()
        .to_string()
}

// ============================================================================
// 对话调用
// ============================================================================

/// 按协议调用 chat，返回响应文本。
///
/// 超时 / 重试 / 退避 / Retry-After / 「只在 connect 失败时重试」等策略对所有协议一致；
/// 只有 openai 会在 400 且响应体提到 response_format 时去掉 json_mode 再试一次
/// （其它协议根本不往 body 里塞 response_format）。
async fn chat_completion(
    protocol: Protocol,
    api_key: &str,
    api_url: &str,
    model: &str,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: Option<u32>,
    json_mode: bool,
) -> Result<String, String> {
    // 先构造一次请求：URL 校验之类的错误要直接抛给用户，不要重试
    build_chat_request(
        protocol,
        api_key,
        api_url,
        model,
        &messages,
        temperature,
        max_tokens,
        json_mode,
    )?;

    let mut json_mode = json_mode;
    let mut last_error = String::new();

    for attempt in 0..MAX_ATTEMPTS {
        let request = build_chat_request(
            protocol,
            api_key,
            api_url,
            model,
            &messages,
            temperature,
            max_tokens,
            json_mode,
        )?;

        let mut http_request = http_client().post(&request.url);
        for (name, value) in &request.headers {
            http_request = http_request.header(*name, value);
        }

        let response = match http_request.json(&request.body).send().await {
            Ok(response) => response,
            Err(error) => {
                last_error = format!("请求 AI 服务失败: {}", error);
                // 只在「根本没连上」时重试：请求可能已经送达的情况不重试，避免重复计费
                if attempt + 1 < MAX_ATTEMPTS && error.is_connect() {
                    tokio::time::sleep(backoff_delay(attempt, None)).await;
                    continue;
                }
                return Err(last_error);
            }
        };

        let status = response.status();
        let retry_after = retry_after_secs(&response);

        if status.is_success() {
            let body_text = response
                .text()
                .await
                .map_err(|e| format!("读取 AI 响应失败: {}", e))?;
            let json: serde_json::Value = serde_json::from_str(&body_text)
                .map_err(|e| format!("解析 AI 响应失败: {}", e))?;
            return extract_protocol_content(protocol, &json);
        }

        let body_text = response.text().await.unwrap_or_default();
        let reason = extract_api_error(&body_text);

        // 部分 OpenAI 兼容实现不支持 response_format：去掉它再试一次
        if protocol == Protocol::OpenAi
            && json_mode
            && status == reqwest::StatusCode::BAD_REQUEST
            && body_text.contains("response_format")
        {
            json_mode = false;
            continue;
        }

        last_error = match status {
            reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN => format!(
                "API Key 无效或没有权限（{}）：{}",
                status.as_u16(),
                reason
            ),
            reqwest::StatusCode::NOT_FOUND => format!(
                "API 地址不存在（404），请确认 API URL 与所选协议匹配：{}",
                reason
            ),
            _ => format!("AI 服务返回错误（{}）：{}", status.as_u16(), reason),
        };

        if !is_retryable_status(status) || attempt + 1 >= MAX_ATTEMPTS {
            return Err(last_error);
        }

        tokio::time::sleep(backoff_delay(attempt, retry_after)).await;
    }

    Err(last_error)
}

// ============================================================================
// 供应商模型列表
// ============================================================================

/// 由 chat/completions 地址推出同源的 `/models` 地址
/// （`https://api.openai.com/v1` 与 `.../v1/chat/completions` 都得到 `.../v1/models`）
fn models_url_from_chat_url(raw: &str) -> Result<String, String> {
    let normalized = normalize_chat_completions_url(raw)?;
    let base = normalized
        .strip_suffix("/chat/completions")
        .unwrap_or(&normalized);
    Ok(format!("{}/models", base.trim_end_matches('/')))
}

/// 各协议的模型列表地址
fn models_url_for(protocol: Protocol, api_url: &str) -> Result<String, String> {
    match protocol {
        Protocol::OpenAi => models_url_from_chat_url(api_url),
        Protocol::Anthropic => with_endpoint(api_url, "v1/models"),
        Protocol::Gemini => with_endpoint(api_url, "v1beta/models"),
        Protocol::Ollama => with_endpoint(api_url, "api/tags"),
    }
}

/// 各协议拉模型列表需要的请求（Key 一律走头部，本地网关可以不带 Key）
fn build_models_request(
    protocol: Protocol,
    api_key: Option<&str>,
    api_url: &str,
) -> Result<ProtocolRequest, String> {
    let api_key = api_key.map(str::trim).filter(|key| !key.is_empty());

    let mut headers: Vec<(&'static str, String)> = Vec::new();
    match protocol {
        Protocol::Anthropic => {
            if let Some(key) = api_key {
                headers.push(("x-api-key", key.to_string()));
            }
            headers.push(("anthropic-version", ANTHROPIC_VERSION.to_string()));
        }
        Protocol::Gemini => {
            if let Some(key) = api_key {
                headers.push(("x-goog-api-key", key.to_string()));
            }
        }
        Protocol::OpenAi | Protocol::Ollama => {
            if let Some(key) = api_key {
                headers.push(("Authorization", format!("Bearer {}", key)));
            }
        }
    }

    Ok(ProtocolRequest {
        url: models_url_for(protocol, api_url)?,
        headers,
        body: serde_json::Value::Null,
    })
}

fn push_model_id(ids: &mut Vec<String>, raw: &str) {
    let id = raw.trim();
    if !id.is_empty() {
        ids.push(id.to_string());
    }
}

/// 从 `/models` / `/api/tags` 响应里收集模型 id：
/// 同时兼容 OpenAI 的 `data[].id` 与 Ollama 的 `models[].name`
fn model_ids_from_response(json: &serde_json::Value) -> Vec<String> {
    let mut ids: Vec<String> = Vec::new();

    if let Some(entries) = json.get("data").and_then(|value| value.as_array()) {
        for entry in entries {
            if let Some(id) = entry.get("id").and_then(|value| value.as_str()) {
                push_model_id(&mut ids, id);
            }
        }
    }

    if let Some(entries) = json.get("models").and_then(|value| value.as_array()) {
        for entry in entries {
            if let Some(name) = entry.get("name").and_then(|value| value.as_str()) {
                push_model_id(&mut ids, name);
            }
        }
    }

    ids.sort();
    ids.dedup();
    ids
}

/// Gemini 的 `models[].name` 长这样：`models/gemini-2.0-flash`，界面里要的是裸 id
fn gemini_model_ids_from_response(json: &serde_json::Value) -> Vec<String> {
    let mut ids: Vec<String> = Vec::new();

    if let Some(entries) = json.get("models").and_then(|value| value.as_array()) {
        for entry in entries {
            if let Some(name) = entry.get("name").and_then(|value| value.as_str()) {
                let name = name.trim();
                let id = name.strip_prefix("models/").unwrap_or(name);
                push_model_id(&mut ids, id);
            }
        }
    }

    ids.sort();
    ids.dedup();
    ids
}

/// 列出某个供应商接口提供的模型
///
/// 本地网关通常不需要 Key，因此 `api_key` 为空时不发送鉴权头。
#[tauri::command]
pub async fn list_provider_models(
    api_type: String,
    api_url: String,
    api_key: Option<String>,
) -> Result<Vec<String>, String> {
    let protocol = Protocol::from_api_type(Some(api_type.as_str()))?;
    let request = build_models_request(protocol, api_key.as_deref(), &api_url)?;

    let mut http_request = http_client().get(&request.url);
    for (name, value) in &request.headers {
        http_request = http_request.header(*name, value);
    }

    let response = http_request
        .send()
        .await
        .map_err(|error| format!("请求模型列表失败: {}", error))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "获取模型列表失败（{}）：{}",
            status,
            extract_api_error(&body)
        ));
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("读取模型列表响应失败: {}", error))?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|error| {
        format!(
            "解析模型列表响应失败（接口返回的不是模型列表格式）: {}",
            error
        )
    })?;

    let models = match protocol {
        Protocol::Gemini => gemini_model_ids_from_response(&json),
        _ => model_ids_from_response(&json),
    };
    if models.is_empty() {
        return Err("该接口没有返回任何模型".to_string());
    }

    Ok(models)
}

// ============================================================================
// 分组名称清理
// ============================================================================

/// 把模型返回的内容收敛成一个干净的分组名称
fn clean_group_name(raw: &str) -> String {
    let first_line = raw
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or("");

    let mut name = first_line
        .trim_matches(|c: char| {
            c.is_whitespace()
                || matches!(
                    c,
                    '"' | '\'' | '`' | '“' | '”' | '‘' | '’' | '。' | '，' | ',' | '.' | '：' | ':'
                )
        })
        .to_string();

    // 「分组名称：开发工具」这类前缀去掉
    for prefix in [
        "分组名称",
        "建议分组",
        "分组",
        "分类",
        "Group",
        "group",
        "Category",
        "category",
    ] {
        if let Some(rest) = name.strip_prefix(prefix) {
            let rest = rest
                .trim_start_matches(|c: char| matches!(c, '：' | ':' | '=' | '-' | '—' | ' '))
                .trim();
            if !rest.is_empty() {
                name = rest.to_string();
            }
            break;
        }
    }

    let name = name
        .trim_matches(|c: char| c.is_whitespace() || matches!(c, '。' | '.' | '，' | ','))
        .replace(['\t', '\r'], " ");

    truncate_chars(&name.split_whitespace().collect::<Vec<_>>().join(" "), 40)
}

// ============================================================================
// 翻译
// ============================================================================

/// 翻译文本命令
/// 支持多种翻译服务提供商
#[tauri::command]
pub async fn translate_text(
    text: String,
    target_lang: String, // 目标语言代码，如 "zh", "en", "ja" 等
    api_type: Option<String>, // "openai" | "anthropic" | "gemini" | "ollama"
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>, // 模型名称
) -> Result<String, String> {
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("文本不能为空".to_string());
    }
    if text.chars().count() > MAX_TEXT_LEN_FOR_TRANSLATE {
        return Err(format!(
            "文本过长（最多 {} 个字符），请分段翻译",
            MAX_TEXT_LEN_FOR_TRANSLATE
        ));
    }

    let protocol = Protocol::from_api_type(api_type.as_deref())?;

    translate_with_chat(protocol, text, target_lang, api_key, api_url, model).await
}

/// 用任意 chat 协议翻译
async fn translate_with_chat(
    protocol: Protocol,
    text: String,
    target_lang: String,
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let api_key = api_key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .unwrap_or_default();
    let api_url = require(api_url, "请提供 API URL")?;
    let model = require(model, "请指定使用的模型")?;

    let lang_name = language_name(&target_lang);
    let system_prompt = format!(
        "你是一个专业的翻译引擎，把用户给出的文本翻译成{lang}。\n\
         规则：\n\
         1. 只输出译文本身，不要解释、不要引号、不要 Markdown 代码块；\n\
         2. 保留原文的换行、缩进、列表符号和代码片段；\n\
         3. 产品名、库名、命令、URL 等专有名词保持原文；\n\
         4. 如果原文已经是{lang}，原样返回。",
        lang = lang_name
    );

    let content = chat_completion(
        protocol,
        &api_key,
        &api_url,
        &model,
        vec![
            ChatMessage::system(system_prompt),
            ChatMessage::user(text),
        ],
        0.2,
        None,
        false,
    )
    .await?;

    Ok(content.trim().to_string())
}

// ============================================================================
// 分类
// ============================================================================

/// 用模板 + 仓库信息组装分类提示词。
///
/// 自定义模板支持占位符：`{repo_name}` / `{description}` / `{groups}`
/// （也接受 `{仓库名称}` `{描述}` `{现有分类}` 等中文写法）。
/// 模板里一个占位符都没有时，会把仓库信息追加到末尾——否则模型根本看不到要分类的内容。
fn build_classify_prompt(
    repo_name: &str,
    description: Option<&str>,
    existing_groups: &[String],
    template: Option<&str>,
) -> String {
    let description_text = description
        .map(|text| truncate_chars(text, MAX_DESC_LEN_FOR_CLASSIFY))
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .unwrap_or_else(|| "无描述".to_string());

    let groups_text = if existing_groups.is_empty() {
        "（当前没有任何主分类）".to_string()
    } else {
        existing_groups.join("、")
    };

    let default_prompt = format!(
        r#"请根据以下信息，为该仓库推荐一个最合适的分组名称：

- 仓库名称：{}
- 描述：{}
- 现有主分类：{}

输出规则：
1. 若仓库明显属于某个现有主分类下的细分类型，输出「主分类/子分类」（例如：工具/音乐工具、AI/图像生成）；
2. 子分类用 2–6 个中文字符，简洁通用；
3. 若无法细分，给出一个新的主分类名称；
4. 只输出分组名称本身，不要解释、标点或其他文字。"#,
        repo_name, description_text, groups_text
    );

    let Some(template) = template.map(str::trim).filter(|t| !t.is_empty()) else {
        return default_prompt;
    };

    let mut rendered = template.to_string();
    let mut used_placeholder = false;

    let mut substitute = |keys: &[&str], value: &str, rendered: &mut String| {
        for key in keys {
            if rendered.contains(key) {
                used_placeholder = true;
                *rendered = rendered.replace(key, value);
            }
        }
    };

    substitute(
        &["{repo_name}", "{repoName}", "{name}", "{仓库名称}"],
        repo_name,
        &mut rendered,
    );
    substitute(
        &["{description}", "{desc}", "{描述}"],
        &description_text,
        &mut rendered,
    );
    substitute(
        &["{groups}", "{existing_groups}", "{existingGroups}", "{现有分类}"],
        &groups_text,
        &mut rendered,
    );

    if !used_placeholder {
        rendered.push_str(&format!(
            "\n\n仓库信息：\n- 仓库名称：{}\n- 描述：{}\n- 现有主分类：{}\n\n只输出一个分组名称，不要其他文字。",
            repo_name, description_text, groups_text
        ));
    }

    rendered
}

/// AI 分类仓库命令
/// 根据仓库信息（名称、描述）和现有分组，建议一个合适的分组
#[tauri::command]
pub async fn classify_repository(
    repo_name: String,
    description: Option<String>,
    existing_groups: Vec<String>, // 现有主分类列表
    api_type: Option<String>,     // 只支持 chat 协议（openai / anthropic / gemini / ollama）
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>, // 模型名称
    prompt_override: Option<String>,
) -> Result<String, String> {
    let repo_name = repo_name.trim().to_string();
    if repo_name.is_empty() {
        return Err("仓库名称不能为空".to_string());
    }

    let protocol = Protocol::from_api_type(api_type.as_deref())?;

    let prompt = build_classify_prompt(
        &repo_name,
        description.as_deref(),
        &existing_groups,
        prompt_override.as_deref(),
    );

    classify_with_chat(protocol, prompt, api_key, api_url, model).await
}

/// 使用任意 chat 协议分类
async fn classify_with_chat(
    protocol: Protocol,
    prompt: String,
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let api_key = api_key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .unwrap_or_default();
    let api_url = require(api_url, "请提供 API URL")?;
    let model = require(model, "请指定使用的模型")?;

    let content = chat_completion(
        protocol,
        &api_key,
        &api_url,
        &model,
        vec![
            ChatMessage::system(
                "你是 GitHub 仓库分类助手。只输出一个分组名称，不要解释、前缀、引号或标点。",
            ),
            ChatMessage::user(prompt),
        ],
        0.2,
        Some(96),
        false,
    )
    .await?;

    let cleaned = clean_group_name(&content);
    if cleaned.is_empty() {
        return Err("AI 返回的分类结果为空".to_string());
    }

    Ok(cleaned)
}

// 处理响应的层级映射结果
#[derive(Serialize, Deserialize)]
pub struct GroupParentMapping {
    pub group: String,
    pub parent: Option<String>,
}

fn clean_json_fenced_block(content: &str) -> String {
    let trimmed = content.trim();
    let without_fence = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```JSON"))
        .or_else(|| trimmed.strip_prefix("```"))
        .unwrap_or(trimmed);
    without_fence
        .trim_end_matches("```")
        .trim()
        .to_string()
}

fn parse_json_object_string(raw: &str) -> Result<serde_json::Value, String> {
    let trimmed = raw.trim();

    // 1) 直接解析
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return Ok(value);
    }

    // 2) 截取首尾大括号之间的内容再解析
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                return Ok(value);
            }
        }
    }

    // 3) 将单引号替换为双引号再尝试
    let replaced_quotes = trimmed.replace('\'', "\"");
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(&replaced_quotes) {
        return Ok(value);
    }

    Err("无法解析 AI 返回的层级结果".to_string())
}

fn parse_lines_to_mappings(raw: &str) -> Vec<GroupParentMapping> {
    let mut results = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let delimiter = ["->", ":", "-", "："].iter().find_map(|sep| trimmed.split_once(sep));

        if let Some((group, parent)) = delimiter {
            let group = group.trim();
            if group.is_empty() {
                continue;
            }
            let parent = parent.trim();
            let parent = if parent.is_empty() {
                None
            } else {
                Some(parent.to_string())
            };
            results.push(GroupParentMapping {
                group: group.to_string(),
                parent,
            });
        }
    }

    results
}

fn parse_hierarchy_response(raw: &str, cleaned: &str) -> Result<Vec<GroupParentMapping>, String> {
    // 先按 JSON 解析
    if let Ok(json_value) = parse_json_object_string(cleaned) {
        let mut results: Vec<GroupParentMapping> = Vec::new();

        if let Some(obj) = json_value.as_object() {
            for (group, parent_value) in obj {
                let trimmed_group = group.trim();
                if trimmed_group.is_empty() {
                    continue;
                }

                let parent = parent_value
                    .as_str()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                results.push(GroupParentMapping {
                    group: trimmed_group.to_string(),
                    parent,
                });
            }

            if !results.is_empty() {
                return Ok(results);
            }
        }

        if let Some(arr) = json_value.as_array() {
            for item in arr {
                // [{"group":"xxx","parent":"yyy"}]
                if let Some(obj) = item.as_object() {
                    if let Some(group_val) = obj.get("group").and_then(|v| v.as_str()) {
                        let parent = obj
                            .get("parent")
                            .and_then(|v| v.as_str())
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty());
                        results.push(GroupParentMapping {
                            group: group_val.trim().to_string(),
                            parent,
                        });
                        continue;
                    }
                }

                // ["group","parent"] / ["group", null]
                if let Some(tuple) = item.as_array() {
                    if let Some(group_val) = tuple.first().and_then(|v| v.as_str()) {
                        let parent = tuple
                            .get(1)
                            .and_then(|v| v.as_str())
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty());
                        results.push(GroupParentMapping {
                            group: group_val.trim().to_string(),
                            parent,
                        });
                        continue;
                    }
                }
            }

            if !results.is_empty() {
                return Ok(results);
            }
        }
    }

    // 退化：行格式解析
    let line_results = parse_lines_to_mappings(cleaned);
    if !line_results.is_empty() {
        return Ok(line_results);
    }

    Err(format!(
        "解析 AI 返回的层级结果失败，原始响应：{}",
        truncate_chars(raw, MAX_ERROR_BODY_CHARS)
    ))
}

/// 分组层级归纳命令（一级文件夹过多时做文件夹聚合）
#[tauri::command]
pub async fn classify_groups_hierarchy(
    groups: Vec<String>,
    api_type: Option<String>,
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>,
) -> Result<Vec<GroupParentMapping>, String> {
    if groups.is_empty() {
        return Err("分组列表不能为空".to_string());
    }

    let protocol = Protocol::from_api_type(api_type.as_deref())?;

    let api_key = api_key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .unwrap_or_default();
    let api_url = require(api_url, "请提供 API URL")?;
    let model = require(model, "请指定使用的模型")?;

    // 为避免 token 过长导致截断，分批处理；某批失败不影响其它批次已得到的结果
    let mut aggregated: HashMap<String, Option<String>> = HashMap::new();
    let mut first_error: Option<String> = None;

    for chunk in groups.chunks(HIERARCHY_CHUNK_SIZE) {
        let prompt = format!(
            r#"请为下面这组文件夹名称设计一层更上层的父级分类。

要求：
1. 只输出一个 JSON 对象：键是给出的原始分组名称（原样照抄），值是它的父级分类名称；
2. 父级分类用 2–6 个中文字符，多个分组可以共享同一个父级；
3. 如果某个分组本身已经是顶层分类、不需要父级，则值为 null；
4. 不要输出 JSON 以外的任何文字。

分组列表：
{}"#,
            chunk
                .iter()
                .map(|group| format!("- {}", group))
                .collect::<Vec<String>>()
                .join("\n")
        );

        let chunk_result = match chat_completion(
            protocol,
            &api_key,
            &api_url,
            &model,
            vec![
                ChatMessage::system("你是信息架构助手，只输出合法的 JSON 对象，不要输出解释或 Markdown 代码块。"),
                ChatMessage::user(prompt),
            ],
            0.1,
            Some(HIERARCHY_MAX_TOKENS),
            // 只有 openai 支持 response_format，其它协议会忽略它
            protocol == Protocol::OpenAi,
        )
        .await
        {
            Ok(raw) => {
                let cleaned = clean_json_fenced_block(&raw);
                parse_hierarchy_response(&raw, &cleaned)
            }
            Err(error) => Err(error),
        };

        let parsed_chunk = match chunk_result {
            Ok(parsed_chunk) => parsed_chunk,
            Err(error) => {
                if first_error.is_none() {
                    first_error = Some(error);
                }
                continue;
            }
        };

        for item in parsed_chunk {
            let key = item.group.trim().to_string();
            if key.is_empty() {
                continue;
            }
            // 后面的批次覆盖前面的同名分组
            aggregated.insert(
                key,
                item.parent
                    .map(|parent| parent.trim().to_string())
                    .filter(|parent| !parent.is_empty()),
            );
        }
    }

    if aggregated.is_empty() {
        return Err(first_error.unwrap_or_else(|| {
            "解析 AI 返回的层级结果失败: 没有得到任何父级映射".to_string()
        }));
    }

    let results: Vec<GroupParentMapping> = aggregated
        .into_iter()
        .map(|(group, parent)| GroupParentMapping { group, parent })
        .collect();

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn groups(list: &[&str]) -> Vec<String> {
        list.iter().map(|item| item.to_string()).collect()
    }

    fn header_value<'a>(request: &'a ProtocolRequest, name: &str) -> Option<&'a str> {
        request
            .headers
            .iter()
            .find(|(key, _)| *key == name)
            .map(|(_, value)| value.as_str())
    }

    #[test]
    fn truncate_chars_counts_characters_not_bytes() {
        assert_eq!(truncate_chars("abc", 5), "abc");
        assert_eq!(truncate_chars("abc", 3), "abc");
        assert_eq!(truncate_chars("abcdef", 3), "abc…");
        assert_eq!(truncate_chars("中文测试", 2), "中文…");
    }

    #[test]
    fn require_rejects_blank_values() {
        assert_eq!(require(Some("  key  ".to_string()), "缺少").unwrap(), "key");
        assert_eq!(require(Some("   ".to_string()), "缺少").unwrap_err(), "缺少");
        assert_eq!(require(None, "缺少").unwrap_err(), "缺少");
    }

    #[test]
    fn normalize_url_completes_openai_endpoint() {
        assert_eq!(
            normalize_chat_completions_url("https://api.deepseek.com").unwrap(),
            "https://api.deepseek.com/v1/chat/completions"
        );
        assert_eq!(
            normalize_chat_completions_url("https://api.deepseek.com/v1/").unwrap(),
            "https://api.deepseek.com/v1/chat/completions"
        );
        assert_eq!(
            normalize_chat_completions_url("https://x.com/v1beta").unwrap(),
            "https://x.com/v1beta/chat/completions"
        );
        assert_eq!(
            normalize_chat_completions_url("https://x.com/v1/chat/completions").unwrap(),
            "https://x.com/v1/chat/completions"
        );
        // 自定义路径保持原样，不硬塞 /v1/chat/completions
        assert_eq!(
            normalize_chat_completions_url("https://open.bigmodel.cn/api/paas/v4").unwrap(),
            "https://open.bigmodel.cn/api/paas/v4"
        );
        assert_eq!(
            normalize_chat_completions_url("").unwrap_err(),
            "请提供 API URL"
        );
        assert_eq!(
            normalize_chat_completions_url("ftp://x.com").unwrap_err(),
            "API URL 必须使用 http/https，当前协议是 ftp"
        );
        assert!(normalize_chat_completions_url("这不是 URL").is_err());
    }

    #[test]
    fn api_error_extraction_prefers_server_message() {
        assert_eq!(
            extract_api_error(r#"{"error":{"message":"Invalid API key"}}"#),
            "Invalid API key"
        );
        assert_eq!(extract_api_error(r#"{"error":"bad request"}"#), "bad request");
        assert_eq!(extract_api_error(r#"{"detail":"not found"}"#), "not found");
        assert_eq!(extract_api_error("   "), "服务端没有返回错误详情");

        let truncated = extract_api_error(&"x".repeat(400));
        assert_eq!(truncated.chars().count(), MAX_ERROR_BODY_CHARS + 1);
        assert!(truncated.ends_with('…'));
    }

    #[test]
    fn strip_wrapping_quotes_handles_common_wrappers() {
        assert_eq!(strip_wrapping_quotes("  \"开发工具\"  "), "开发工具");
        assert_eq!(strip_wrapping_quotes("“音乐”"), "音乐");
        assert_eq!(strip_wrapping_quotes("plain"), "plain");
    }

    #[test]
    fn chat_content_reads_choices_and_reports_truncation() {
        let ok = json!({
            "choices": [{ "message": { "content": "  \"工具\"  " }, "finish_reason": "stop" }]
        });
        assert_eq!(extract_protocol_content(Protocol::OpenAi, &ok).unwrap(), "工具");

        let truncated = json!({
            "choices": [{ "message": { "content": "long" }, "finish_reason": "length" }]
        });
        assert!(extract_protocol_content(Protocol::OpenAi, &truncated)
            .unwrap_err()
            .contains("截断"));

        let empty = json!({
            "choices": [{ "message": { "content": "   " }, "finish_reason": "stop" }]
        });
        assert!(extract_protocol_content(Protocol::OpenAi, &empty)
            .unwrap_err()
            .contains("空内容"));

        assert!(extract_protocol_content(Protocol::OpenAi, &json!({ "choices": [] }))
            .unwrap_err()
            .contains("choices[0]"));

        // 200 里塞 error 对象的兼容实现
        assert!(
            extract_protocol_content(Protocol::OpenAi, &json!({ "error": { "message": "bad key" } }))
                .unwrap_err()
                .contains("bad key")
        );
    }

    #[test]
    fn clean_group_name_strips_model_noise() {
        assert_eq!(clean_group_name("分组名称：开发工具\n"), "开发工具");
        assert_eq!(clean_group_name("\n  \"机器学习\"  \n"), "机器学习");
        assert_eq!(clean_group_name("Group: Web Dev\n"), "Web Dev");
        assert_eq!(clean_group_name("web-dev"), "web-dev");
        assert_eq!(clean_group_name(""), "");
    }

    #[test]
    fn classify_prompt_uses_default_template_and_placeholders() {
        let default_prompt =
            build_classify_prompt("vue", Some("渐进式框架"), &groups(&["工具"]), None);
        assert!(default_prompt.contains("仓库名称：vue"));
        assert!(default_prompt.contains("描述：渐进式框架"));
        assert!(default_prompt.contains("现有主分类：工具"));

        let no_groups = build_classify_prompt("vue", None, &[], None);
        assert!(no_groups.contains("描述：无描述"));
        assert!(no_groups.contains("（当前没有任何主分类）"));

        let long_desc = "x".repeat(MAX_DESC_LEN_FOR_CLASSIFY + 50);
        let truncated = build_classify_prompt("vue", Some(&long_desc), &[], None);
        assert!(truncated.contains('…'));
        assert!(!truncated.contains(&long_desc));

        let custom = build_classify_prompt(
            "vue",
            Some("渐进式框架"),
            &groups(&["工具", "AI"]),
            Some("给 {repo_name} 选一个分组，描述是 {description}，已有 {groups}"),
        );
        assert!(custom.contains("给 vue 选一个分组"));
        assert!(custom.contains("描述是 渐进式框架"));
        assert!(custom.contains("已有 工具、AI"));
        assert!(!custom.contains("仓库信息："));

        let custom_cn = build_classify_prompt(
            "vue",
            Some("x"),
            &[],
            Some("仓库：{仓库名称}，描述：{描述}"),
        );
        assert!(custom_cn.contains("仓库：vue，描述：x"));

        // 模板里没有任何占位符时，必须把仓库信息补到末尾，否则模型看不到要分类的内容
        let no_placeholder = build_classify_prompt(
            "vue",
            Some("渐进式框架"),
            &groups(&["工具"]),
            Some("请给它分组"),
        );
        assert!(no_placeholder.contains("请给它分组"));
        assert!(no_placeholder.contains("仓库信息："));
        assert!(no_placeholder.contains("仓库名称：vue"));
    }

    #[test]
    fn hierarchy_response_parses_object_array_and_lines() {
        let object_raw = r#"{"工具":"开发","AI":null}"#;
        let parsed = parse_hierarchy_response(object_raw, object_raw).unwrap();
        assert_eq!(parsed.len(), 2);
        let tool = parsed.iter().find(|item| item.group == "工具").unwrap();
        assert_eq!(tool.parent.as_deref(), Some("开发"));
        assert_eq!(
            parsed.iter().find(|item| item.group == "AI").unwrap().parent,
            None
        );

        let array_raw = r#"[{"group":"音乐","parent":"娱乐"}]"#;
        let array_parsed = parse_hierarchy_response(array_raw, array_raw).unwrap();
        assert_eq!(array_parsed.len(), 1);
        assert_eq!(array_parsed[0].group, "音乐");
        assert_eq!(array_parsed[0].parent.as_deref(), Some("娱乐"));

        let tuple_raw = r#"[["音乐","娱乐"],["工具",null]]"#;
        let tuple_parsed = parse_hierarchy_response(tuple_raw, tuple_raw).unwrap();
        assert_eq!(tuple_parsed.len(), 2);
        assert!(tuple_parsed
            .iter()
            .any(|item| item.group == "工具" && item.parent.is_none()));

        let lines = "工具 -> 开发\n音乐 : 娱乐";
        assert_eq!(parse_hierarchy_response(lines, lines).unwrap().len(), 2);

        assert!(parse_hierarchy_response("完全不是结构化内容", "完全不是结构化内容").is_err());
    }

    #[test]
    fn fenced_json_block_is_unwrapped() {
        assert_eq!(clean_json_fenced_block("```json\n{\"a\":1}\n```"), "{\"a\":1}");
        assert_eq!(clean_json_fenced_block("```\n{\"a\":1}\n```"), "{\"a\":1}");
        assert_eq!(clean_json_fenced_block("{\"a\":1}"), "{\"a\":1}");
    }

    #[test]
    fn models_url_is_derived_from_chat_endpoint() {
        assert_eq!(
            models_url_for(Protocol::OpenAi, "https://api.openai.com/v1").unwrap(),
            "https://api.openai.com/v1/models"
        );
        assert_eq!(
            models_url_for(Protocol::OpenAi, "https://api.openai.com/v1/chat/completions").unwrap(),
            "https://api.openai.com/v1/models"
        );
        assert_eq!(
            models_url_for(Protocol::OpenAi, "  https://api.deepseek.com  ").unwrap(),
            "https://api.deepseek.com/v1/models"
        );
        assert_eq!(
            models_url_for(Protocol::Anthropic, "https://api.anthropic.com").unwrap(),
            "https://api.anthropic.com/v1/models"
        );
        assert_eq!(
            models_url_for(Protocol::Gemini, "https://generativelanguage.googleapis.com").unwrap(),
            "https://generativelanguage.googleapis.com/v1beta/models"
        );
        assert_eq!(
            models_url_for(Protocol::Ollama, "http://localhost:11434").unwrap(),
            "http://localhost:11434/api/tags"
        );
        assert_eq!(
            models_url_for(Protocol::OpenAi, "").unwrap_err(),
            "请提供 API URL"
        );
        assert!(models_url_for(Protocol::OpenAi, "   ").is_err());
        assert!(models_url_for(Protocol::OpenAi, "ftp://x.com").is_err());
    }

    #[test]
    fn model_ids_read_openai_and_ollama_shapes() {
        let openai = json!({
            "data": [{ "id": "gpt-4o" }, { "id": "gpt-4o" }, { "id": "  " }, { "id": 7 }]
        });
        assert_eq!(model_ids_from_response(&openai), vec!["gpt-4o"]);

        let ollama = json!({
            "models": [{ "name": "llama3" }, { "name": " qwen2 " }, { "name": "" }]
        });
        assert_eq!(model_ids_from_response(&ollama), vec!["llama3", "qwen2"]);

        let both = json!({
            "data": [{ "id": "b" }, { "id": "a" }],
            "models": [{ "name": "a" }]
        });
        assert_eq!(model_ids_from_response(&both), vec!["a", "b"]);

        assert!(model_ids_from_response(&json!({ "object": "list" })).is_empty());
    }

    // ------------------------------------------------------------------
    // 协议解析
    // ------------------------------------------------------------------

    #[test]
    fn protocol_from_api_type_maps_all_known_values() {
        assert_eq!(
            Protocol::from_api_type(Some("openai")).unwrap(),
            Protocol::OpenAi
        );
        assert_eq!(
            Protocol::from_api_type(Some("anthropic")).unwrap(),
            Protocol::Anthropic
        );
        assert_eq!(
            Protocol::from_api_type(Some("gemini")).unwrap(),
            Protocol::Gemini
        );
        assert_eq!(
            Protocol::from_api_type(Some("ollama")).unwrap(),
            Protocol::Ollama
        );

        // 历史数据里可能混入大小写和空白
        assert_eq!(
            Protocol::from_api_type(Some("  OpenAI ")).unwrap(),
            Protocol::OpenAi
        );

        assert_eq!(
            Protocol::from_api_type(Some("grok")).unwrap_err(),
            "不支持的 API 协议: grok"
        );
        assert_eq!(
            Protocol::from_api_type(None).unwrap_err(),
            "未指定 API 协议 (api_type 为空)"
        );
        assert_eq!(
            Protocol::from_api_type(Some("   ")).unwrap_err(),
            "未指定 API 协议 (api_type 为空)"
        );
    }

    #[test]
    fn unsupported_protocols_are_rejected() {
        // 已移除的 google 协议（老库里的残留数据）
        assert_eq!(
            Protocol::from_api_type(Some("google")).unwrap_err(),
            "不支持的 API 协议: google"
        );
    }

    // ------------------------------------------------------------------
    // anthropic
    // ------------------------------------------------------------------

    #[test]
    fn anthropic_request_uses_messages_endpoint_and_top_level_system() {
        let messages = vec![
            ChatMessage::system("你是翻译引擎"),
            ChatMessage::user("hello"),
        ];
        let request = build_chat_request(
            Protocol::Anthropic,
            "sk-ant-key",
            "https://api.anthropic.com",
            "claude-3-5-sonnet",
            &messages,
            0.2,
            None,
            false,
        )
        .unwrap();

        assert_eq!(request.url, "https://api.anthropic.com/v1/messages");
        assert_eq!(header_value(&request, "x-api-key"), Some("sk-ant-key"));
        assert_eq!(
            header_value(&request, "anthropic-version"),
            Some("2023-06-01")
        );
        // Key 不能出现在 URL 里
        assert!(!request.url.contains("sk-ant-key"));

        assert_eq!(request.body["model"], "claude-3-5-sonnet");
        // max_tokens 必填：调用方没给就用默认值
        assert_eq!(
            request.body["max_tokens"],
            json!(DEFAULT_ANTHROPIC_MAX_TOKENS)
        );
        assert_eq!(request.body["temperature"], json!(0.2f32 as f64));
        // system 被抽到顶层，messages 里只剩 user
        assert_eq!(request.body["system"], "你是翻译引擎");
        let body_messages = request.body["messages"].as_array().unwrap();
        assert_eq!(body_messages.len(), 1);
        assert_eq!(body_messages[0]["role"], "user");
        assert_eq!(body_messages[0]["content"], "hello");

        // 显式给了 max_tokens 就用显式值
        let with_max = build_chat_request(
            Protocol::Anthropic,
            "k",
            "https://api.anthropic.com/v1/messages",
            "claude-3-5-haiku",
            &messages,
            0.1,
            Some(64),
            false,
        )
        .unwrap();
        assert_eq!(with_max.body["max_tokens"], json!(64));
        // 已经带了 /v1/messages 就不要重复拼
        assert_eq!(with_max.url, "https://api.anthropic.com/v1/messages");
        // 其它协议忽略 json_mode，anthropic 更不能出现 response_format
        assert!(with_max.body.get("response_format").is_none());
    }

    #[test]
    fn anthropic_content_concatenates_blocks_and_reports_truncation() {
        let json = json!({
            "content": [
                { "type": "text", "text": "你" },
                { "type": "text", "text": "好" }
            ],
            "stop_reason": "end_turn"
        });
        assert_eq!(
            extract_protocol_content(Protocol::Anthropic, &json).unwrap(),
            "你好"
        );

        let truncated = json!({
            "content": [{ "type": "text", "text": "很长" }],
            "stop_reason": "max_tokens"
        });
        let error = extract_protocol_content(Protocol::Anthropic, &truncated).unwrap_err();
        assert!(error.contains("截断"));

        assert!(extract_protocol_content(Protocol::Anthropic, &json!({ "content": [] }))
            .unwrap_err()
            .contains("空内容"));
        assert!(
            extract_protocol_content(Protocol::Anthropic, &json!({ "stop_reason": "end_turn" }))
                .unwrap_err()
                .contains("content")
        );
    }

    // ------------------------------------------------------------------
    // gemini
    // ------------------------------------------------------------------

    #[test]
    fn gemini_request_puts_model_in_path_and_key_in_header() {
        let messages = vec![
            ChatMessage::system("你是翻译引擎"),
            ChatMessage::user("hello"),
        ];
        let request = build_chat_request(
            Protocol::Gemini,
            "AIza-secret",
            "https://generativelanguage.googleapis.com",
            "gemini-2.0-flash",
            &messages,
            0.3,
            Some(256),
            true,
        )
        .unwrap();

        assert_eq!(
            request.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        );
        // Key 走头部，绝不进 URL / query
        assert!(!request.url.contains("AIza-secret"));
        assert!(!request.url.contains("key="));
        assert_eq!(
            header_value(&request, "x-goog-api-key"),
            Some("AIza-secret")
        );

        let contents = request.body["contents"].as_array().unwrap();
        assert_eq!(contents.len(), 1);
        assert_eq!(contents[0]["role"], "user");
        assert_eq!(contents[0]["parts"][0]["text"], "hello");
        assert_eq!(
            request.body["systemInstruction"]["parts"][0]["text"],
            "你是翻译引擎"
        );
        assert_eq!(
            request.body["generationConfig"]["temperature"],
            json!(0.3f32 as f64)
        );
        assert_eq!(
            request.body["generationConfig"]["maxOutputTokens"],
            json!(256)
        );
        // gemini 不认 response_format
        assert!(request.body.get("response_format").is_none());

        // 没给 max_tokens 时不要塞 maxOutputTokens
        let no_max = build_chat_request(
            Protocol::Gemini,
            "k",
            "https://generativelanguage.googleapis.com/v1beta",
            "gemini-2.0-flash",
            &messages,
            0.2,
            None,
            false,
        )
        .unwrap();
        assert!(no_max.body["generationConfig"]
            .get("maxOutputTokens")
            .is_none());
        assert_eq!(
            no_max.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        );

        // 已经写全了 generateContent 就保持原样
        let full = build_chat_request(
            Protocol::Gemini,
            "k",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            "gemini-2.0-flash",
            &messages,
            0.2,
            None,
            false,
        )
        .unwrap();
        assert_eq!(
            full.url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        );
    }

    #[test]
    fn gemini_content_concatenates_parts_and_reports_truncation() {
        let json = json!({
            "candidates": [{
                "content": { "parts": [{ "text": "你" }, { "text": "好" }], "role": "model" },
                "finishReason": "STOP"
            }]
        });
        assert_eq!(
            extract_protocol_content(Protocol::Gemini, &json).unwrap(),
            "你好"
        );

        let truncated = json!({
            "candidates": [{
                "content": { "parts": [{ "text": "很长" }] },
                "finishReason": "MAX_TOKENS"
            }]
        });
        let error = extract_protocol_content(Protocol::Gemini, &truncated).unwrap_err();
        assert!(error.contains("截断"));

        assert!(extract_protocol_content(Protocol::Gemini, &json!({ "candidates": [] }))
            .unwrap_err()
            .contains("candidates[0]"));
    }

    #[test]
    fn gemini_model_ids_strip_models_prefix() {
        let json = json!({
            "models": [
                { "name": "models/gemini-2.0-flash" },
                { "name": "models/gemini-2.0-flash" },
                { "name": " models/gemini-1.5-pro " },
                { "name": "gemini-2.5-pro" },
                { "name": "" }
            ]
        });
        assert_eq!(
            gemini_model_ids_from_response(&json),
            vec!["gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.5-pro"]
        );

        assert!(gemini_model_ids_from_response(&json!({ "data": [] })).is_empty());
    }

    // ------------------------------------------------------------------
    // ollama
    // ------------------------------------------------------------------

    #[test]
    fn ollama_url_appends_api_chat_once() {
        assert_eq!(
            normalize_ollama_url("http://localhost:11434").unwrap(),
            "http://localhost:11434/api/chat"
        );
        assert_eq!(
            normalize_ollama_url("http://localhost:11434/").unwrap(),
            "http://localhost:11434/api/chat"
        );
        assert_eq!(
            normalize_ollama_url("http://localhost:11434/api/chat").unwrap(),
            "http://localhost:11434/api/chat"
        );
        // 反向代理挂在子路径下时不能把用户写的 base 丢掉
        assert_eq!(
            normalize_ollama_url("https://box.local/ollama").unwrap(),
            "https://box.local/ollama/api/chat"
        );
        assert_eq!(normalize_ollama_url("").unwrap_err(), "请提供 API URL");
        assert_eq!(
            normalize_ollama_url("ftp://x.com").unwrap_err(),
            "API URL 必须使用 http/https，当前协议是 ftp"
        );
    }

    #[test]
    fn ollama_request_body_uses_stream_false_and_bearer_only_when_key_given() {
        let messages = vec![
            ChatMessage::system("你是分类助手"),
            ChatMessage::user("vue"),
        ];

        // 本地默认没有 Key：不发 Authorization
        let anonymous = build_chat_request(
            Protocol::Ollama,
            "",
            "http://localhost:11434",
            "llama3",
            &messages,
            0.5,
            Some(128),
            true,
        )
        .unwrap();
        assert_eq!(anonymous.url, "http://localhost:11434/api/chat");
        assert!(header_value(&anonymous, "Authorization").is_none());
        assert_eq!(anonymous.body["model"], "llama3");
        assert_eq!(anonymous.body["stream"], json!(false));
        assert_eq!(anonymous.body["options"]["temperature"], json!(0.5f32 as f64));
        assert_eq!(anonymous.body["options"]["num_predict"], json!(128));
        assert_eq!(anonymous.body["format"], "json");
        // ollama 的 system 仍然留在 messages 里
        let body_messages = anonymous.body["messages"].as_array().unwrap();
        assert_eq!(body_messages.len(), 2);
        assert_eq!(body_messages[0]["role"], "system");

        // 带鉴权的自托管网关：仍然发 Bearer
        let with_key = build_chat_request(
            Protocol::Ollama,
            "gateway-token",
            "http://localhost:11434",
            "llama3",
            &messages,
            0.5,
            None,
            false,
        )
        .unwrap();
        assert_eq!(
            header_value(&with_key, "Authorization"),
            Some("Bearer gateway-token")
        );
        assert!(with_key.body["options"].get("num_predict").is_none());
        assert!(with_key.body.get("format").is_none());
    }

    #[test]
    fn ollama_content_reads_message_and_reports_length() {
        let json = json!({
            "model": "llama3",
            "message": { "role": "assistant", "content": "  \"工具\"  " },
            "done": true,
            "done_reason": "stop"
        });
        assert_eq!(
            extract_protocol_content(Protocol::Ollama, &json).unwrap(),
            "工具"
        );

        let truncated = json!({
            "message": { "role": "assistant", "content": "很长" },
            "done_reason": "length"
        });
        let error = extract_protocol_content(Protocol::Ollama, &truncated).unwrap_err();
        assert!(error.contains("截断"));

        assert!(extract_protocol_content(Protocol::Ollama, &json!({ "done": true }))
            .unwrap_err()
            .contains("message.content"));
    }

    // ------------------------------------------------------------------
    // openai 回归
    // ------------------------------------------------------------------

    #[test]
    fn openai_request_keeps_bearer_and_response_format() {
        let messages = vec![
            ChatMessage::system("sys"),
            ChatMessage::user("hi"),
        ];
        let request = build_chat_request(
            Protocol::OpenAi,
            "sk-key",
            "https://api.deepseek.com",
            "deepseek-chat",
            &messages,
            0.2,
            Some(96),
            true,
        )
        .unwrap();

        assert_eq!(request.url, "https://api.deepseek.com/v1/chat/completions");
        assert_eq!(
            header_value(&request, "Authorization"),
            Some("Bearer sk-key")
        );
        assert_eq!(request.body["model"], "deepseek-chat");
        assert_eq!(request.body["max_tokens"], json!(96));
        assert_eq!(
            request.body["response_format"],
            json!({ "type": "json_object" })
        );
        let body_messages = request.body["messages"].as_array().unwrap();
        assert_eq!(body_messages.len(), 2);
        assert_eq!(body_messages[0]["role"], "system");
        assert_eq!(body_messages[0]["content"], "sys");
    }

    #[test]
    fn models_request_uses_per_protocol_headers_and_urls() {
        let anthropic =
            build_models_request(Protocol::Anthropic, Some("sk-ant"), "https://api.anthropic.com")
                .unwrap();
        assert_eq!(anthropic.url, "https://api.anthropic.com/v1/models");
        assert_eq!(header_value(&anthropic, "x-api-key"), Some("sk-ant"));
        assert_eq!(
            header_value(&anthropic, "anthropic-version"),
            Some("2023-06-01")
        );

        let gemini = build_models_request(
            Protocol::Gemini,
            Some("AIza"),
            "https://generativelanguage.googleapis.com",
        )
        .unwrap();
        assert_eq!(
            gemini.url,
            "https://generativelanguage.googleapis.com/v1beta/models"
        );
        assert_eq!(header_value(&gemini, "x-goog-api-key"), Some("AIza"));

        // Ollama 匿名：不带鉴权头
        let ollama =
            build_models_request(Protocol::Ollama, None, "http://localhost:11434").unwrap();
        assert_eq!(ollama.url, "http://localhost:11434/api/tags");
        assert!(header_value(&ollama, "Authorization").is_none());

        // OpenAI 传了 Key 才带 Bearer
        let openai =
            build_models_request(Protocol::OpenAi, Some("sk-key"), "https://api.openai.com/v1")
                .unwrap();
        assert_eq!(openai.url, "https://api.openai.com/v1/models");
        assert_eq!(
            header_value(&openai, "Authorization"),
            Some("Bearer sk-key")
        );
    }
}
