export type WebSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
  };
};

export type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

export type WebSpeechRecognitionConstructor = new () => WebSpeechRecognition;

type WindowWithSpeechRecognition = Window & typeof globalThis & {
  SpeechRecognition?: WebSpeechRecognitionConstructor;
  webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
};

export function getSpeechRecognitionConstructor(): WebSpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as WindowWithSpeechRecognition;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}
