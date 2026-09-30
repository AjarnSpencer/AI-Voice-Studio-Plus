export interface TranscriptMessage {
  speaker: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

export interface ElectronSaveFileOptions {
  content: string;
  defaultPath?: string;
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  isBase64?: boolean;
}

export interface ElectronOpenFileOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    electronAPI?: {
      showInFolder: (path: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      saveFile: (options: ElectronSaveFileOptions | any) => Promise<boolean>;
      openFile: (options: ElectronOpenFileOptions | any) => Promise<string | null>;
      platform: string;
    };
    aistudio?: AIStudio;
  }
}

