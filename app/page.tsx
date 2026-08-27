"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  folderPreview?: string;
  webContentLink?: string;
  webViewLink?: string;
}

// --- 追加: 画像の読み込み状態を管理する軽量コンポーネント ---
const FileThumbnail = ({ src, isVideo, isFolder }: { src?: string; isVideo?: boolean; isFolder?: boolean }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // サムネイルがない場合（またはフォルダでプレビューなしの場合）
  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
        <span className={isFolder ? "text-6xl" : "text-4xl opacity-20"}>
          {isFolder ? "📂" : "📄"}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-800">
      {/* 読み込み中のスケルトン表示 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-gray-800">
          <span className="text-4xl opacity-10">{isVideo ? "🎞️" : "🖼️"}</span>
        </div>
      )}
      
      <img
        src={src}
        alt=""
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-700 ${
          isLoaded ? "opacity-60 group-hover:opacity-100" : "opacity-0"
        } ${!isFolder && isLoaded ? "opacity-100" : ""}`}
      />

      {/* 動画アイコン（読み込み完了後に出す） */}
      {isVideo && isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm text-2xl group-hover:scale-110 transition">▶️</div>
        </div>
      )}

      {/* フォルダアイコンのオーバーレイ */}
      {isFolder && (
        <div className="absolute top-3 left-3 z-10 text-3xl drop-shadow-lg">📂</div>
      )}
    </div>
  );
};

export default function Home() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [history, setHistory] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      setLoading(true);
      fetch(`/api/drive?folderId=${currentFolderId}`)
        .then((res) => res.json())
        .then((data) => {
          setFiles(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Fetch error:", err);
          setLoading(false);
        });
    }
  }, [session, currentFolderId]);

  const handleFolderClick = (id: string) => {
    setHistory((prev) => [...prev, currentFolderId]);
    setCurrentFolderId(id);
  };

  const handleBack = () => {
    const newHistory = [...history];
    const prevFolderId = newHistory.pop();
    if (prevFolderId) {
      setCurrentFolderId(prevFolderId);
      setHistory(newHistory);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white text-center p-4">
        <h1 className="text-4xl font-bold mb-4 italic tracking-tighter">Drive VieweR</h1>
        <p className="text-gray-400 mb-8">Googleドライブをアルバム化</p>
        <button onClick={() => signIn("google")} className="bg-blue-600 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 transition transform hover:scale-105">
          Googleアカウントでログイン
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-950 min-h-screen text-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-gray-900/50 p-4 rounded-xl backdrop-blur-md sticky top-0 z-10 border border-gray-800">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-blue-400 tracking-tight">画像保管庫</h1>
            {currentFolderId !== "root" && (
              <button onClick={handleBack} className="bg-gray-800 hover:bg-gray-700 px-4 py-1 rounded-lg text-sm transition">
                ← 戻る
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{session.user?.name}</span>
            <button onClick={() => signOut()} className="bg-red-900/20 text-red-400 px-3 py-1 rounded hover:bg-red-900/40 transition font-medium">ログアウト</button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col justify-center items-center py-40 gap-4">
             <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
             <span className="text-gray-500 font-medium">データを取得中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {files.map((file) => {
              const isFolder = file.mimeType === "application/vnd.google-apps.folder";
              const isVideo = file.mimeType.startsWith("video/");
              
              const thumbUrl = file.thumbnailLink?.replace("=s220", "=s400");
              const folderThumbUrl = file.folderPreview?.replace("=s220", "=s400");

              return (
                <div 
                  key={file.id} 
                  className="group cursor-pointer bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all shadow-md hover:shadow-blue-500/10"
                  onClick={() => isFolder ? handleFolderClick(file.id) : setSelectedFile(file)}
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-800">
                    <FileThumbnail 
                      src={isFolder ? folderThumbUrl : thumbUrl} 
                      isVideo={isVideo} 
                      isFolder={isFolder} 
                    />
                  </div>
                  <div className="p-3 bg-gray-900/80 backdrop-blur-sm">
                    <p className="text-[11px] text-center truncate text-gray-400 group-hover:text-white transition-colors">
                      {file.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-40 text-gray-600 italic">
            このフォルダは空っぽだよ
          </div>
        )}
      </div>

      {/* プレビューモーダル */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 transition-all backdrop-blur-sm" onClick={() => setSelectedFile(null)}>
          <button className="absolute top-6 right-6 text-white text-3xl hover:scale-125 transition">✕</button>
          <div className="max-w-5xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            {selectedFile.mimeType.startsWith("image/") ? (
              <img 
                src={selectedFile.thumbnailLink?.replace("=s220", "=s1600") || ""} 
                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg" 
                alt={selectedFile.name} 
              />
            ) : selectedFile.mimeType.startsWith("video/") ? (
              <iframe 
                src={selectedFile.webViewLink?.replace("/view", "/preview")} 
                className="w-full aspect-video rounded-2xl shadow-2xl border border-gray-800 bg-black" 
                allow="autoplay" 
              />
            ) : (
              <div className="text-center bg-gray-900 p-12 rounded-3xl border border-gray-800">
                <p className="mb-8 text-xl">このファイルはプレビューできないよ</p>
                <a href={selectedFile.webContentLink} className="bg-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition">ダウンロード</a>
              </div>
            )}
            <p className="mt-6 text-gray-300 text-lg font-medium tracking-wide bg-black/40 px-4 py-1 rounded-full">{selectedFile.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}