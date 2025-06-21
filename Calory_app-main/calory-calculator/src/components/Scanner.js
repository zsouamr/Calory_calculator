import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

const Scanner = ({ onDetected, onClose }) => {
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();

    const startScanner = async () => {
      try {
        await codeReader.current.decodeFromVideoDevice(
          null,
          videoRef.current,
          (result, err) => {
            if (result) {
              onDetected(result.getText());
              codeReader.current.reset(); // stop after detection
            }
          }
        );
      } catch (error) {
        console.error('Scanner error:', error);
      }
    };

    startScanner();

    return () => {
      try {
        codeReader.current.stopContinuousDecode();
      } catch (e) {
        console.warn('Erreur en arrêtant le scanner :', e);
      }
    };
  }, [onDetected]);

  return (
    <div style={{ textAlign: 'center' }}>
      <video ref={videoRef} width="400" height="300" />
      <br />
      <button onClick={onClose} style={{ marginTop: '10px' }}>Close</button>
    </div>
  );
};

export default Scanner;
