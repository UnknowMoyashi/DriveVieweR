"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  folderPreview?: string; // フォルダ内の1枚目の画像
  webContentLink?: string;
  webViewLink?: string;
}

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
        <h1 className="text-4xl font-bold mb-4">Drive VieweR</h1>
        <p className="text-gray-400 mb-8">Googleドライブを見やすくするやつ</p>
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
            <h1 className="text-xl font-bold text-blue-400">画像保管庫</h1>
            {currentFolderId !== "root" && (
              <button onClick={handleBack} className="bg-gray-800 hover:bg-gray-700 px-4 py-1 rounded-lg text-sm transition">
                ← 戻る
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{session.user?.name}</span>
            <button onClick={() => signOut()} className="bg-red-900/20 text-red-400 px-3 py-1 rounded hover:bg-red-900/40 transition">ログアウト</button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-40">
             <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
             <span className="ml-3 text-gray-400">読み込み中...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {files.map((file) => {
              const isFolder = file.mimeType === "application/vnd.google-apps.folder";
              const isVideo = file.mimeType.startsWith("video/");
              
              // サムネイルとフォルダプレビューのURL調整
              const thumbUrl = file.thumbnailLink?.replace("=s220", "=s128");
              const folderThumbUrl = file.folderPreview?.replace("=s220", "=s128");

              return (
                <div 
                  key={file.id} 
                  className="group cursor-pointer bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all shadow-md hover:shadow-blue-500/10"
                  onClick={() => isFolder ? handleFolderClick(file.id) : setSelectedFile(file)}
                >
                  <div className="aspect-square relative">
                    {isFolder ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                        {folderThumbUrl ? (
                          <div className="relative w-full h-full p-2">
                            <div className="absolute top-3 left-3 z-10 text-3xl drop-shadow-lg">📂</div>
                            <img src={folderThumbUrl} alt="" loading="lazy"  className="w-full h-full object-cover rounded-xl opacity-60 group-hover:opacity-100 transition duration-300" />
                          </div>
                        ) : (
                          <div className="text-6xl group-hover:scale-110 transition duration-300">📂</div>
                        )}
                      </div>
                    ) : (
                      <>
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover transition duration-300 group-hover:scale-110" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-700 text-xs italic">No Preview</div>
                        )}
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">▶️</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-3 bg-gray-900/80 backdrop-blur-sm">
                    <p className="text-xs text-center truncate text-gray-400 group-hover:text-white transition-colors">
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
            このフォルダには表示できるアイテムがないよ
          </div>
        )}
      </div>

      {/* プレビューモーダル（以前と同じ） */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 transition-all" onClick={() => setSelectedFile(null)}>
          <button className="absolute top-6 right-6 text-white text-3xl hover:scale-125 transition">✕</button>
          <div className="max-w-5xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            {selectedFile.mimeType.startsWith("image/") ? (
              <img src={selectedFile.thumbnailLink?.replace("=s220", "=s1600") || ""} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded" alt="" />
            ) : selectedFile.mimeType.startsWith("video/") ? (
              <iframe src={selectedFile.webViewLink?.replace("/view", "/preview")} className="w-full aspect-video rounded-2xl shadow-2xl border border-gray-800" allow="autoplay" />
            ) : (
              <div className="text-center bg-gray-900 p-12 rounded-3xl border border-gray-800">
                <p className="mb-8 text-xl">プレビューできないよ</p>
                <a href={selectedFile.webContentLink} className="bg-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition">ダウンロード</a>
              </div>
            )}
            <p className="mt-6 text-gray-300 text-lg font-medium tracking-wide">{selectedFile.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
