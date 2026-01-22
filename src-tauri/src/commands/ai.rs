/**
 * AI 功能命令模块
 * 提供翻译、分类等功能
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 分类描述的最大长度（字符数）
const MAX_DESC_LEN_FOR_CLASSIFY: usize = 500;

/// 翻译文本命令
/// 支持多种翻译服务提供商
#[tauri::command]
pub async fn translate_text(
    text: String,
    target_lang: String, // 目标语言代码，如 "zh", "en", "ja" 等
    api_type: Option<String>, // "符合 openai api 接口规范的api"
    api_key: Option<String>,
    api_url: Option<String>,
    _region: Option<String>, // 预留字段，用来后续适配其他类型api
    model: Option<String>, // OpenAI 模型名称
) -> Result<String, String> {
    if text.trim().is_empty() {
        return Err("文本不能为空".to_string());
    }


    // 如果后续需要支持更多api类型，可以在这里扩展
    match api_type.as_deref() {
       
        Some("openai") => {
            translate_with_openai(text, target_lang, api_key, api_url, model).await
        }
       
        Some("google") => {
            translate_with_google(text, target_lang).await
        }
        /* Some("microsoft") => {
            translate_with_microsoft(text, target_lang, api_key, api_url, region).await
        } */
        Some(provider) => {
            Err(format!("不支持的翻译提供商: {}", provider))
        }
        None => {
            Err("未指定翻译提供商 (api_type 为空)".to_string())
        }
    }
}



/// 使用 OpenAI API 翻译
async fn translate_with_openai(
    text: String,
    target_lang: String,
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    
    
    let api_key=api_key.ok_or_else(|| "请提供 API Key".to_string())?;
    let api_url=api_url.ok_or_else(|| "请提供 API URL".to_string())?;
    let model=model.ok_or_else(|| "请指定使用的模型".to_string())?;
    // 将语言代码转换为语言名称
    let lang_name = match target_lang.as_str() {
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
    };

    
    // 构建翻译提示语
    let prompt = format!("请将以下文本翻译成{}，只返回翻译结果，不要添加任何解释：\n\n{}", lang_name, text);



    #[derive(Serialize)]
    struct Message {
        role: String,
        content: String,
    }

    #[derive(Serialize)]
    struct RequestBody {
        model: String,
        messages: Vec<Message>,
        temperature: f32,
    }

    let request_body = RequestBody {
        model: model.clone().to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        temperature: 0.3,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求 OpenAI API 失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
        return Err(format!("OpenAI API 返回错误: {} - {}", status, error_text));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析 OpenAI 响应失败: {}", e))?;

    let translated_text = json
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "无法解析 OpenAI 响应".to_string())?;

    Ok(translated_text.trim().to_string())
}

/// 使用 Google Translate 公共 API 翻译
async fn translate_with_google(
    text: String,
    target_lang: String,
) -> Result<String, String> {
    // 使用 Google Translate 的公共 API
    // 注意：这是免费的公共接口，可能有请求限制
    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={}&dt=t&q={}",
        target_lang,
        urlencoding::encode(&text)
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("翻译 API 返回错误: {}", response.status()));
    }

    // Google Translate API 返回的是嵌套数组格式
    // [[["翻译后的文本","原文",null,null,0]],null,"auto"]
    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    // 提取翻译结果
    let translated_text = json
        .get(0)
        .and_then(|arr| arr.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|item| item.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "无法解析翻译结果".to_string())?;

    Ok(translated_text.to_string())
}

/* async fn translate_with_microsoft(
    text: String,
    target_lang: String,
    api_key: Option<String>,
    api_url: Option<String>,
    region: Option<String>,
) -> Result<String, String> {
    let api_key = api_key.ok_or_else(|| "请提供微软翻译 API Key".to_string())?;
    let region = region.ok_or_else(|| "请提供微软翻译区域".to_string())?;
    let endpoint = api_url.unwrap_or_else(|| {
        "https://api-edge.cognitive.microsofttranslator.com/translate".to_string()
    });

    #[derive(Serialize)]
    struct MicrosoftTranslateRequest {
        #[serde(rename = "Text")]
        text: String,
    }

    #[derive(Deserialize)]
    struct MicrosoftTranslation {
        text: String,
    }

    #[derive(Deserialize)]
    struct MicrosoftTranslateResponseItem {
        translations: Vec<MicrosoftTranslation>,
    }

    let request_body = vec![MicrosoftTranslateRequest { text }];

    let client = reqwest::Client::new();
    let response = client
        .post(&endpoint)
        .query(&[("api-version", "3.0"), ("to", target_lang.as_str())])
        .header("Ocp-Apim-Subscription-Key", &api_key)
        .header("Ocp-Apim-Subscription-Region", &region)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求微软翻译 API 失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "未知错误".to_string());
        return Err(format!("微软翻译 API 返回错误: {} - {}", status, error_text));
    }

    let response_body: Vec<MicrosoftTranslateResponseItem> = response
        .json()
        .await
        .map_err(|e| format!("解析微软翻译响应失败: {}", e))?;

    let translated = response_body
        .get(0)
        .and_then(|item| item.translations.get(0))
        .map(|translation| translation.text.trim().to_string())
        .filter(|t| !t.is_empty())
        .ok_or_else(|| "无法解析微软翻译结果".to_string())?;

    Ok(translated)
} */


/// AI 分类仓库命令
/// 根据仓库信息（名称、描述）和现有分组，建议一个合适的分组
#[tauri::command]
pub async fn classify_repository(
    repo_name: String,
    description: Option<String>,
    existing_groups: Vec<String>,// 现有主分类列表
    api_type: Option<String>, // 目前仅支持 "openai"（兼容 OpenAI 接口规范的实现）
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>, // OpenAI 模型名称
    prompt_override: Option<String>,
) -> Result<String, String> {
    if repo_name.trim().is_empty() {
        return Err("仓库名称不能为空".to_string());
    }

    let desc_len = description
        .as_ref()
        .map(|d| d.chars().count())
        .unwrap_or(0);
    if desc_len > MAX_DESC_LEN_FOR_CLASSIFY {
        return Ok("其他".to_string());
    }

    let groups_list = if existing_groups.is_empty() {
        "当前无任何主分类，请直接创建一个合适的中文分组名称（2–4 个汉字），例如：“开发工具”、“机器学习”。".to_string()
    } else {
        format!(
            r#"-现有主分类：{}。

请严格按以下规则输出分组名称：
- 若仓库明显属于某主分类下的具体类型，请输出“主分类/子分类”（例如：工具/音乐工具、AI/图像生成、资源/表情包资源）；
- 子分类必须为 2–4 个中文字符，简洁且通用；
- 若无法细分，请给出一个新的主分类。"#,
            existing_groups.join("、")
        )
    };

    let description_text = description.as_deref().unwrap_or("无描述");
    let default_prompt = format!(
        r#"你是一个 GitHub 仓库智能分类助手。

请根据以下信息，为该仓库推荐一个最合适的分组名称：

- 仓库名称：{}
- 描述：{}
{}

注意：仅返回分组名称（如“开发工具”或“AI/图像生成”），不要包含任何其他文字、说明、标点或格式。"#,
        repo_name,
        description_text,
        groups_list
    );

    let prompt = if let Some(p) = prompt_override {
        let trimmed = p.trim();
        if !trimmed.is_empty() { trimmed.to_string() } else { default_prompt }
    } else {
        default_prompt
    };


    // 如果后续需要支持更多api类型，可以在这里扩展
    match api_type.as_deref() {
        Some("openai") => {
            classify_with_openai(prompt, api_key, api_url, model).await
        }
        Some(provider) => {
            Err(format!("不支持的api提供商: {}", provider))
        }
        None => {
            Err("未指定api提供商 (api_type 为空)".to_string())
        }
    }
}

/// 使用 OpenAI API 进行分类
async fn classify_with_openai(
    prompt: String,
    api_key: Option<String>,
    api_url: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
      
    let api_key = api_key.ok_or_else(|| "请提供 OpenAI API Key".to_string())?;
    let api_url = api_url.ok_or_else(|| "请提供 OpenAI API URL".to_string())?;
    let model = model.ok_or_else(|| "请指定使用的模型".to_string())?;

    #[derive(Serialize)]
    struct Message {
        role: String,
        content: String,
    }

    #[derive(Serialize)]
    struct RequestBody {
        model: String,
        messages: Vec<Message>,
        temperature: f32,
        max_tokens: u32,
    }

    let request_body = RequestBody {
        model: model.clone(),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        temperature: 0.3, // 降低温度以获得更一致的结果
        max_tokens: 50, // 只需要返回分组名称，不需要太多token
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求 OpenAI API 失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
        return Err(format!("OpenAI API 返回错误: {} - {}", status, error_text));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析 OpenAI 响应失败: {}", e))?;

    // 提取分类结果
    let classification = json
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "无法解析 OpenAI 响应".to_string())?;

    // 清理结果：移除可能的引号、空格等
    let cleaned = classification.trim().trim_matches('"').trim_matches('\'').trim().to_string();
    
    if cleaned.is_empty() {
        return Err("AI 返回的分类结果为空".to_string());
    }

    Ok(cleaned)
}



//处理响应的层级映射结果
#[derive(Serialize, Deserialize)]
pub struct GroupParentMapping {
    pub group: String,
    pub parent: Option<String>,
}

fn clean_json_fenced_block(content: &str) -> String {
    let trimmed = content.trim();
    if trimmed.starts_with("```json") {
        return trimmed
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
            .to_string();
    }
    if trimmed.starts_with("```") {
        return trimmed
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
            .to_string();
    }
    trimmed.to_string()
}

fn parse_json_object_string(raw: &str) -> Result<serde_json::Value, String> {
    let trimmed = raw.trim();

    // 1) 直接解析
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return Ok(v);
    }

    // 2) 截取首尾大括号之间的内容再解析
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if start < end {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                return Ok(v);
            }
        }
    }

    // 3) 将单引号替换为双引号再尝试
    let replaced_quotes = trimmed.replace('\'', "\"");
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&replaced_quotes) {
        return Ok(v);
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

        let delimiter = ["->", ":", "-", "："]
            .iter()
            .find_map(|sep| trimmed.split_once(sep));

        if let Some((group, parent)) = delimiter {
            let g = group.trim();
            if g.is_empty() {
                continue;
            }
            let p = parent.trim();
            let parent_opt = if p.is_empty() { None } else { Some(p.to_string()) };
            results.push(GroupParentMapping {
                group: g.to_string(),
                parent: parent_opt,
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
                    if let Some(group_val) = tuple.get(0).and_then(|v| v.as_str()) {
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

    Err(format!("解析 AI 返回的层级结果失败: raw={}", raw))
}



// 分组层级归纳命令(一级文件夹过多，进行文件夹聚合)
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

    //打印groups内容
    for group in &groups {
        println!("[classify_groups_hierarchy] group: {}", group);
    }
    // 为避免 token 过长导致截断，分批处理
    const CHUNK_SIZE: usize = 30;

    let mut aggregated: HashMap<String, Option<String>> = HashMap::new();

    for (idx, chunk) in groups.chunks(CHUNK_SIZE).enumerate() {
        let prompt = format!(
            r#"你将看到一组现有的文件夹/分组名称，请基于它们整体设计一层父级分类。返回 JSON 对象，键是原始分组名称，值是父级名称；如果无需父级则值为 null 或空串。

要求：
1. 仅返回 JSON，对象键和值都是字符串，且父级名称用简短中文。
2. 不要解释，不要额外文本。

分组列表：
{}"#,
            chunk
                .iter()
                .map(|g| format!("- {}", g))
                .collect::<Vec<String>>()
                .join("\n")
        );


        // 如果后续需要支持更多api类型，可以在这里扩展
        let raw = match api_type.as_deref() {
            Some("openai") => {
                chat_completion_openai_json(&prompt, &api_key, &api_url, &model, 384).await
            }
            Some(provider) => {
                Err(format!("不支持的api提供商: {}", provider))
            }
            None => {
                Err("未指定api提供商 (api_type 为空)".to_string())
            }
        }?;

        println!("[classify_groups_hierarchy][chunk {}] prompt: {}", idx, prompt);

        println!("[classify_groups_hierarchy][chunk {}] raw response: {}", idx, raw);

        let cleaned = clean_json_fenced_block(&raw);
        // println!("[classify_groups_hierarchy][chunk {}] cleaned response: {}", idx, cleaned);

        let parsed_chunk = parse_hierarchy_response(&raw, &cleaned)?;

        for item in parsed_chunk {
            let key = item.group.trim().to_string();
            if key.is_empty() {
                continue;
            }
            // 后面的批次覆盖前面的同名分组
            aggregated.insert(key, item.parent.map(|p| p.trim().to_string()).filter(|p| !p.is_empty()));
        }
    }

    if aggregated.is_empty() {
        return Err("解析 AI 返回的层级结果失败: 没有得到任何父级映射".to_string());
    }

    let results: Vec<GroupParentMapping> = aggregated
        .into_iter()
        .map(|(group, parent)| GroupParentMapping { group, parent })
        .collect();

    Ok(results)
}

// 使用 OpenAI API 进行分组层级归纳,文件夹聚合
async fn chat_completion_openai_json(
    prompt: &str, 
    api_key: &Option<String>,
    api_url: &Option<String>,
    model: &Option<String>,
    max_tokens: u32,
) -> Result<String, String> {
    let api_key = api_key.as_deref().ok_or_else(|| "请提供 OpenAI API Key".to_string())?;
    let api_url = api_url.as_deref().ok_or_else(|| "请提供 OpenAI API URL".to_string())?;
    let model = model.as_deref().ok_or_else(|| "请指定使用的模型".to_string())?;

    #[derive(Serialize)]
    struct Message {
        role: String,
        content: String,
    }

    #[derive(Serialize)]
    struct RequestBody {
        model: String,
        messages: Vec<Message>,
        temperature: f32,
        max_tokens: u32,
    }

    let request_body = RequestBody {
        model: model.to_string(),  // 👈 从 &str 转为 String（必要）
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt.to_string(), // 👈 同样需要 owned String
        }],
        temperature: 0.2,
        max_tokens,
    };

    let client = reqwest::Client::new();
    let response = client
        .post(api_url)  // 👈 直接用 &str
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求 OpenAI API 失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
        return Err(format!("OpenAI API 返回错误: {} - {}", status, error_text));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析 OpenAI 响应失败: {}", e))?;

    let content = json
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|arr| arr.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "无法解析 OpenAI 响应".to_string())?;

    Ok(content.trim().to_string())
}