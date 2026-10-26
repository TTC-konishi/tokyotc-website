// netlify/functions/publish.js
// スタッフ編集アプリから送信された記事・設定JSONをGitHub本番リポジトリ（tokyotc-website）へ直接コミット・公開するサーバーレス関数

const REPO_OWNER = "TTC-konishi";
const REPO_NAME = "tokyotc-website";
const TARGET_BRANCH = "main";

const PAGE_PATHS = {
  readme: "public/content/konkatsu/readme.json",
  feature: "public/content/konkatsu/feature.json",
  plan: "public/content/konkatsu/plan.json",
  greeting: "public/content/konkatsu/greeting.json",
  flow: "public/content/konkatsu/flow.json",
  data: "public/content/konkatsu/data.json",
  faq: "public/content/konkatsu/faq.json",
  access: "public/content/konkatsu/access.json",
  blog: "public/content/konkatsu/blog.json"
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

// このリポジトリは package.json が "type": "module" のため ES モジュールの書き方にする
export const handler = async function (event, context) {
  // CORSプリフライト（OPTIONS）リクエストへの対応
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  // 合言葉の確認：Netlify の環境変数 STAFF_PUBLISH_KEY と、Authorization: Bearer <キー> が一致したときだけ通す
  const publishKey = process.env.STAFF_PUBLISH_KEY;
  if (!publishKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "サーバー側の設定エラー: STAFF_PUBLISH_KEY が設定されていません。" })
    };
  }
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const presentedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!presentedKey || presentedKey !== publishKey) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "認証に失敗しました。公開キーが正しくありません。" })
    };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "サーバー側の設定エラー: GITHUB_TOKEN が設定されていません。" })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "送信データが不正なJSONです。" })
    };
  }

  const { pageKey, content, author } = payload;
  const filePath = PAGE_PATHS[pageKey];

  if (!filePath) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `未対応のページキーです: ${pageKey}` })
    };
  }

  if (!content || typeof content !== "object") {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "更新データ（content）が含まれていません。" })
    };
  }

  try {
    // 1. 現在のファイルの SHA を取得（GitHub Contents API）
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${TARGET_BRANCH}`;
    const getRes = await fetch(getUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "TTC-Staff-Editor"
      }
    });

    let currentSha = null;
    if (getRes.ok) {
      const existingData = await getRes.json();
      currentSha = existingData.sha;
    } else if (getRes.status !== 404) {
      const errText = await getRes.text();
      return {
        statusCode: getRes.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `GitHubからの既存ファイル取得に失敗しました: ${errText}` })
      };
    }

    // 2. JSONを整形してBase64化
    const formattedJson = JSON.stringify(content, null, 2) + "\n";
    const base64Content = Buffer.from(formattedJson, "utf8").toString("base64");

    const commitAuthor = author || "スタッフ";
    const commitMessage = `[Staff Editor] ${pageKey} を更新 (${commitAuthor})`;

    // 3. GitHub Contents API に PUT してコミット作成
    const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    const putBody = {
      message: commitMessage,
      content: base64Content,
      branch: TARGET_BRANCH
    };
    if (currentSha) {
      putBody.sha = currentSha;
    }

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "TTC-Staff-Editor"
      },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const putErr = await putRes.text();
      return {
        statusCode: putRes.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `GitHubへの保存に失敗しました: ${putErr}` })
      };
    }

    const putResult = await putRes.json();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: "本番GitHubへの保存が完了しました。Netlifyの自動公開が始まります。",
        commit: putResult.commit?.sha
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: `例外エラーが発生しました: ${err.message}` })
    };
  }
};
