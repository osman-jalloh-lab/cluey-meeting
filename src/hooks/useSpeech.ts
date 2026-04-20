import { useState, useEffect, useRef } from 'react';

export function useSpeech() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recogRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setIsSupported(false);
      return;
    }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (e: any) => {
      setError(null);
      let currentInterim = '';
      let currentFinal = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const item = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          currentFinal += item + ' ';
        } else {
          currentInterim += item;
        }
      }
      setTranscript(prev => prev + currentFinal);
      setInterim(currentInterim);
    };

    recog.onerror = (e: any) => {
      const msg: Record<string, string> = {
        'not-allowed':    'Microphone access was denied. Allow mic access in your browser and try again.',
        'no-speech':      'No speech detected. Try speaking closer to your mic.',
        'audio-capture':  'No microphone found. Plug one in and try again.',
        'network':        'Network error — check your connection and try again.',
        'aborted':        '',
      };
      const text = msg[e.error] ?? `Recording error: ${e.error}`;
      if (text) setError(text);
      stopRec();
    };

    recog.onend = () => {
      if (isRecordingRef.current) {
        try { recog.start(); } catch {}
      }
    };

    recogRef.current = recog;
    return () => {
      try { recog.stop(); } catch {}
    };
  }, []);

  const startRec = () => {
    if (!recogRef.current || isRecordingRef.current) return;
    setError(null);
    setTranscript('');
    setInterim('');
    setSeconds(0);
    isRecordingRef.current = true;
    setIsRecording(true);

    timerRef.current = window.setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    try {
      recogRef.current.start();
    } catch (e) {
      setError('Could not start recording. Please try again.');
      stopRec();
    }
  };

  const stopRec = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterim('');
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recogRef.current) {
      try { recogRef.current.stop(); } catch {}
    }
  };

  const toggleRec = () => isRecordingRef.current ? stopRec() : startRec();

  const reset = () => {
    setTranscript('');
    setInterim('');
    setSeconds(0);
    setError(null);
  };

  return {
    isRecording,
    transcript,
    setTranscript,
    interim,
    seconds,
    isSupported,
    error,
    startRec,
    stopRec,
    toggleRec,
    reset,
  };
}
