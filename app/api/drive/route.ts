import { google } from "googleapis";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") || "root";

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token.accessToken as string });
  const drive = google.drive({ version: "v3", auth });

  try {
    let allFiles: any[] = [];
    let pageToken: string | undefined = undefined;

    // --- ループ処理で全件取得 ---
    do {
      const response: any = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        // 一度の取得件数を最大(1000)に設定してリクエスト回数を減らす
        pageSize: 1000, 
        fields: "nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, webViewLink)",
        orderBy: "folder, name",
        pageToken: pageToken,
      });

      if (response.data.files) {
        allFiles = [...allFiles, ...response.data.files];
      }
      
      // 次のページがある場合はトークンが返ってくる。なければ undefined になる
      pageToken = response.data.nextPageToken;

      // セキュリティ上の配慮：あまりにもファイルが多い場合（例：3000件以上）
      // タイムアウトを避けるため、ここで打ち切る設定も可能です
      if (allFiles.length > 3000) break; 

    } while (pageToken);

    // --- フォルダのプレビュー取得（並列処理） ---
    // ※注意：フォルダ数が多いとここが重くなります。上位20フォルダ程度に絞るのも手です
    const filesWithPreviews = await Promise.all(
      allFiles.map(async (file) => {
        if (file.mimeType !== "application/vnd.google-apps.folder") return file;
        try {
          const childRes = await drive.files.list({
            q: `'${file.id}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: "files(thumbnailLink)",
            pageSize: 1,
          });
          return { ...file, folderPreview: childRes.data.files?.[0]?.thumbnailLink || null };
        } catch {
          return file;
        }
      })
    );

    return NextResponse.json(filesWithPreviews);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "API Error" }, { status: 500 });
  }
}