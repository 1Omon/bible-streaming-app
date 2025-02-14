// src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause } from 'lucide-react';

const App = () => {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(null);
  const [error, setError] = useState(null);

  const websocketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const initializeWebSocket = () => {
    websocketRef.current = new WebSocket('ws://localhost:8080');

    websocketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'verse') {
        setCurrentVerse(data.verse);
      }
    };

    websocketRef.current.onerror = () => {
      setError('Connection error. Please try again.');
      stopListening();
    };
  };

  const initializeAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(event.data);
        }
      };

      mediaRecorder.start(1000); // Send audio chunks every second
    } catch (err) {
      setError('Microphone access denied. Please enable microphone permissions.');
      stopListening();
    }
  };

  const startListening = async () => {
    setError(null);
    setIsListening(true);
    setIsPaused(false);
    
    initializeWebSocket();
    await initializeAudioRecording();
  };

  const pauseListening = () => {
    setIsPaused(true);
    mediaRecorderRef.current?.pause();
  };

  const continueListening = () => {
    setIsPaused(false);
    mediaRecorderRef.current?.resume();
  };

  const stopListening = () => {
    setIsListening(false);
    setIsPaused(false);
    setCurrentVerse(null);

    // Cleanup
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    websocketRef.current?.close();
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-xl font-semibold text-center mb-8">VerseCatch</h1>

        <div className="bg-white rounded-lg shadow-sm p-8">
          {error && (
            <div className="text-red-500 text-center mb-4">{error}</div>
          )}

          {currentVerse ? (
            <div className="text-center mb-8">
              <h2 className="text-xl font-medium mb-4">
                {currentVerse.reference} ({currentVerse.version})
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {currentVerse.text}
              </p>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-gray-500">
                Press the button below to start listening
              </p>
            </div>
          )}

          <div className="mt-8">
            <div className="text-center text-sm text-gray-500 mb-4">
              Transcribing and detecting<br />
              Bible quotations in real time.
            </div>

            <div className="flex justify-center">
              {!isListening ? (
                <button
                  onClick={startListening}
                  className="bg-black text-white px-4 py-2 rounded-md flex items-center hover:bg-gray-800"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Listening
                </button>
              ) : isPaused ? (
                <button
                  onClick={continueListening}
                  className="bg-black text-white px-4 py-2 rounded-md flex items-center hover:bg-gray-800"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Continue Listening
                </button>
              ) : (
                <div className="space-x-2">
                  <button
                    onClick={pauseListening}
                    className="border border-gray-200 px-4 py-2 rounded-md flex items-center hover:bg-gray-50"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </button>
                  <button
                    onClick={stopListening}
                    className="border border-gray-200 px-4 py-2 rounded-md flex items-center hover:bg-gray-50"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;