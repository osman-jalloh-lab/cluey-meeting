import { useState, useEffect, useRef } from 'react';

export function useSpeech() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recogRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false); // stable ref for onend closure

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

    recog.onerror = () => stopRec();
    recog.onend = () => {
      if (isRecordingRef.current) {
        try { recog.start(); } catch {} // auto-restart continuous
      }
    };

    recogRef.current = recog;
    return () => {
      try { recog.stop(); } catch {}
    };
  }, []); // only run once — onend reads isRecordingRef, not stale closure

  const startRec = () => {
    if (!recogRef.current || isRecordingRef.current) return;
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
    } catch {}
  };

  const stopRec = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
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
  };

  return {
    isRecording,
    transcript,
    setTranscript,
    interim,
    seconds,
    isSupported,
    startRec,
    stopRec,
    toggleRec,
    reset
  };
}
