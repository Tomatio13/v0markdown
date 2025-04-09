export interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string | null;
  modifiedTime?: string | null;
}

// ファイルをモジュールとして認識させるための空のエクスポート
export {} 