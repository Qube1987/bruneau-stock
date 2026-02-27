import { useState, useRef, useEffect } from 'react';
import { Camera, X, Zap, ZapOff, Type, QrCode } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Tesseract from 'tesseract.js';

interface CameraScannerProps {
  onScanResult: (text: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

type ScanMode = 'qr' | 'ocr';

export function CameraScanner({ onScanResult, onClose, isOpen }: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanMode>('qr');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (scanMode === 'qr') {
        startQRScanner();
      } else {
        startOCRCamera();
      }
    } else {
      stopAllScanners();
    }

    return () => {
      stopAllScanners();
    };
  }, [isOpen, scanMode]);

  const startQRScanner = () => {
    if (!scannerElementRef.current) return;

    try {
      setError('');
      setIsScanning(true);

      // Configuration du scanner QR
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      // Créer le scanner
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        config,
        false
      );

      // Callbacks
      const onScanSuccess = (decodedText: string, decodedResult: any) => {
        console.log('Scan QR réussi:', decodedText);
        onScanResult(decodedText);
        stopAllScanners();
        onClose();
      };

      const onScanFailure = (error: string) => {
        // Ne pas afficher les erreurs de scan en continu
      };

      // Démarrer le scan
      scannerRef.current.render(onScanSuccess, onScanFailure);

    } catch (err: any) {
      console.error('Erreur lors du démarrage du scanner QR:', err);
      setError('Impossible de démarrer le scanner. Vérifiez les permissions de la caméra.');
      setIsScanning(false);
    }
  };

  const startOCRCamera = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Demander l'accès à la caméra
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

    } catch (err: any) {
      console.error('Erreur lors de l\'accès à la caméra:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setIsScanning(false);
    }
  };

  const captureAndProcessOCR = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessingOCR(true);
    setError('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Impossible d\'obtenir le contexte du canvas');
      }

      // Définir la taille du canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capturer l'image
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convertir en blob pour Tesseract
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Erreur lors de la capture de l\'image');
          setIsProcessingOCR(false);
          return;
        }

        try {
          // Traitement OCR avec Tesseract
          const { data: { text } } = await Tesseract.recognize(blob, 'fra+eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`Progression OCR: ${Math.round(m.progress * 100)}%`);
              }
            }
          });

          const cleanText = text.trim();
          if (cleanText) {
            console.log('Texte détecté:', cleanText);
            onScanResult(cleanText);
            stopAllScanners();
            onClose();
          } else {
            setError('Aucun texte détecté. Essayez de vous rapprocher ou d\'améliorer l\'éclairage.');
          }
        } catch (err: any) {
          console.error('Erreur OCR:', err);
          setError('Erreur lors de la reconnaissance de texte. Réessayez.');
        } finally {
          setIsProcessingOCR(false);
        }
      }, 'image/jpeg', 0.8);

    } catch (err: any) {
      console.error('Erreur lors de la capture:', err);
      setError('Erreur lors de la capture de l\'image.');
      setIsProcessingOCR(false);
    }
  };

  const stopAllScanners = () => {
    // Arrêter le scanner QR
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Erreur lors de l\'arrêt du scanner QR:', err);
      }
    }

    // Arrêter le flux vidéo OCR
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsScanning(false);
    setIsProcessingOCR(false);
  };

  const switchScanMode = (mode: ScanMode) => {
    stopAllScanners();
    setScanMode(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Scanner</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode Selection */}
        <div className="flex border-b">
          <button
            onClick={() => switchScanMode('qr')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors',
              scanMode === 'qr'
                ? 'bg-[#E72C63] text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            )}
          >
            <QrCode className="h-4 w-4" />
            QR / Code-barres
          </button>
          <button
            onClick={() => switchScanMode('ocr')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors',
              scanMode === 'ocr'
                ? 'bg-[#E72C63] text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            )}
          >
            <Type className="h-4 w-4" />
            Texte (OCR)
          </button>
        </div>

        <div className="relative">
          {error && (
            <div className="bg-red-50 p-3 border-b">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="p-4">
            {scanMode === 'qr' ? (
              <div 
                id="qr-reader" 
                ref={scannerElementRef}
                className="w-full"
              />
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Overlay de visée pour OCR */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white border-dashed rounded-lg w-48 h-32 flex items-center justify-center">
                    <Type className="h-8 w-8 text-white opacity-50" />
                  </div>
                </div>

                {/* Bouton de capture */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <Button
                    onClick={captureAndProcessOCR}
                    disabled={isProcessingOCR || !isScanning}
                    className="bg-[#E72C63] hover:bg-[#E72C63]/90 text-white px-6 py-2"
                  >
                    {isProcessingOCR ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Analyse...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Capturer
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 text-center border-t bg-gray-50">
          {scanMode === 'qr' ? (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Pointez la caméra vers un QR code ou un code-barres
              </p>
              <p className="text-xs text-gray-500">
                Formats supportés : QR Code, Code 128, Code 39, EAN-13, EAN-8
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Positionnez le texte dans le cadre et appuyez sur Capturer
              </p>
              <p className="text-xs text-gray-500">
                Reconnaissance en français et anglais
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}