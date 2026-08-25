export interface TranscriptMessage {
  speaker: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      showInFolder: (path: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      saveFile: (options: { content: string, defaultPath?: string, title?: string, filters?: any[] }) => Promise<boolean>;
      openFile: (options: { title?: string, filters?: any[] }) => Promise<string | null>;
      platform: string;
    };
  }
}
