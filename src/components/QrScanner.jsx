import { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserQRCodeReader, NotFoundException } from '@zxing/library';
import { X, Camera, Upload, Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { extractChaveAcesso } from '@/api/comprovantes';
import { toast } from 'sonner';

/**
 * Valida se o texto do QR code para determinar se é uma NFC-e válida
 * Aceita: URLs, chaves de acesso e textos relacionados a NFC-e
 */
const validateNFCeText = (text) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'Texto vazio ou inválido' };
  }

  const trimmed = text.trim();
  
  // Verifica se é uma URL válida
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Verifica se contém palavras-chave relacionadas a NFC-e
    const hasNFCeKeywords = ['nfce', 'sefaz', 'nfe', 'chave', 'cupom'].some(keyword => 
      trimmed.toLowerCase().includes(keyword)
    );
    if (hasNFCeKeywords) {
      return { valid: true, type: 'url', value: trimmed };
    }
  }

  // Verifica se é uma chave de acesso (44 dígitos)
  const chave = extractChaveAcesso(trimmed);
  if (chave) {
    return { valid: true, type: 'chave', value: trimmed, chaveAcesso: chave };
  }

  // Verifica se contém palavras-chave mesmo não sendo URL
  const hasKeywords = ['nfce', 'sefaz', 'nfe', 'cupom fiscal', 'chave de acesso'].some(keyword => 
    trimmed.toLowerCase().includes(keyword)
  );
  if (hasKeywords) {
    return { valid: true, type: 'texto', value: trimmed };
  }

  return { valid: false, reason: 'Não parece ser uma NFC-e válida' };
};

export default function QrScanner({ onScan, onClose }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [lastScanAttempts, setLastScanAttempts] = useState(0);
  
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);
  const lastLoggedErrorRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Stop camera and reset reader
  const stopCamera = useCallback(() => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    } catch (e) {
      console.error('[QrScanner] Error stopping camera:', e);
    }
    setIsCameraActive(false);
    setStatus('');
    setLastScanAttempts(0);
  }, []);

  // Handle camera stop
  const handleStopCamera = () => {
    stopCamera();
  };

  // List available cameras
  const listCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      setHasMultipleCameras(videoDevices.length > 1);
      
      // Prefer back camera on mobile if available
      const backCamera = videoDevices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('traseira')
      );
      if (backCamera) {
        setSelectedCamera(backCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
      
      console.log('[QrScanner] Cameras found:', videoDevices.length);
    } catch (err) {
      console.error('[QrScanner] Error listing cameras:', err);
    }
  };

  // Wait for video element to be available
  const waitForVideoRef = () => {
    return new Promise((resolve, reject) => {
      const maxAttempts = 30;
      let attempts = 0;
      
      const check = () => {
        attempts++;
        if (videoRef.current) {
          resolve(videoRef.current);
        } else if (attempts >= maxAttempts) {
          reject(new Error('Elemento de vídeo não encontrado'));
        } else {
          setTimeout(check, 50);
        }
      };
      
      check();
    });
  };

  const createOptimizedReader = () => {
    return new BrowserQRCodeReader({
      delayBetweenScanAttempts: 500, // Aumenta o intervalo para reduzir carga
      tryHarder: true,
      tryHarderWithoutRotation: false,
      possibleFormats: ['QR_CODE'],
    }, {
      audio: false,
      video: { facingMode: 'environment' }
    });
  };

  const handleStartCamera = async (deviceId = undefined) => {
    console.log('[QrScanner] Starting camera...');
    setError('');
    setStatus('Acessando câmera...');
    setScanning(true);
    setLastScanAttempts(0);
    
    try {
      // Clean up any existing reader
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }

      // Set isCameraActive first to render the video element
      setIsCameraActive(true);
      
      // Wait for video ref to be available
      const videoElement = await waitForVideoRef();

      // Initialize QR code reader with optimized settings
      codeReaderRef.current = createOptimizedReader();

      // Request permission and start decoding
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId || undefined,
        videoElement,
        (result, err) => {
          if (!mountedRef.current) return;
          
          if (result) {
            console.log('[QrScanner] QR code detected:', result.text.substring(0, 100));
            handleResult(result.text);
          }
          
          if (err && !(err instanceof NotFoundException)) {
            // Evita poluir o console com erros repetidos
            const errMessage = err?.message || String(err);
            if (errMessage !== lastLoggedErrorRef.current) {
              console.error('[QrScanner] QR Scan Error:', err);
              lastLoggedErrorRef.current = errMessage;
            }
          }
        }
      );

      setStatus('Aponte o QR Code da NFC-e para a câmera');
      
      // List available cameras for switching
      await listCameras();
      
    } catch (err) {
      console.error('[QrScanner] Camera Error:', err);
      setIsCameraActive(false);
      
      // Handle specific camera errors with user-friendly messages
      if (err.name === 'NotAllowedError' || err.message?.includes('permission') || err.message?.includes('denied')) {
        setError('Permissão da câmera negada. Por favor, conceda acesso nas configurações do navegador e recarregue a página.');
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found') || err.message?.includes('no video')) {
        setError('Nenhuma câmera encontrada. Conecte uma câmera e tente novamente.');
      } else if (err.name === 'NotReadableError' || err.message?.includes('not readable') || err.message?.includes('in use')) {
        setError('Câmera está em uso por outro aplicativo. Feche outros apps e tente novamente.');
      } else if (err.name === 'OverconstrainedError') {
        // Try with default constraints if specific ones fail
        if (!deviceId) {
          setStatus('Tentando com configurações padrão...');
          setIsCameraActive(false);
          await handleStartCameraFallback();
          return;
        }
        setError('Câmera não suporta as configurações solicitadas.');
      } else if (err.name === 'AbortError') {
        setError('Operação cancelada. Tente novamente.');
      } else if (err.name === 'TypeError') {
        setError('Erro de configuração da câmera. Verifique se o navegador suporta acesso à câmera.');
      } else {
        setError(`Erro ao acessar a câmera: ${err.message || 'Tente novamente.'}`);
      }
    } finally {
      if (mountedRef.current) {
        setScanning(false);
      }
    }
  };

  // Fallback method with simpler constraints
  const handleStartCameraFallback = async () => {
    console.log('[QrScanner] Using fallback camera method');
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }

      // Set isCameraActive first to render video element
      setIsCameraActive(true);
      
      // Wait for video ref
      const videoElement = await waitForVideoRef();

      codeReaderRef.current = new BrowserQRCodeReader(
        { delayBetweenScanAttempts: 400, tryHarder: true },
        { audio: false, video: true }
      );

      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, err) => {
          if (!mountedRef.current) return;
          if (result) handleResult(result.text);
          if (err && !(err instanceof NotFoundException)) {
            const errMessage = err?.message || String(err);
            if (errMessage !== lastLoggedErrorRef.current) {
              console.error('[QrScanner] QR Scan Error:', err);
              lastLoggedErrorRef.current = errMessage;
            }
          }
        }
      );

      setStatus('Aponte o QR Code da NFC-e para a câmera');
      await listCameras();
    } catch (fallbackErr) {
      console.error('[QrScanner] Fallback camera error:', fallbackErr);
      setIsCameraActive(false);
      setError('Não foi possível acessar a câmera. Tente usar a opção de upload de imagem.');
    } finally {
      if (mountedRef.current) {
        setScanning(false);
      }
    }
  };

  // Handle switching cameras
  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].deviceId;
    
    console.log('[QrScanner] Switching to camera:', nextIndex);
    setSelectedCamera(nextCameraId);
    stopCamera();
    setTimeout(() => handleStartCamera(nextCameraId), 300);
  };

  // Try to decode image with multiple rotations for better results
  const tryDecodeWithRotations = async (reader, imageUrl) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    // Create a canvas to manipulate the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Try original first
    try {
      const result = await reader.decodeFromImageElement(img);
      console.log('[QrScanner] Decoded without rotation');
      return result;
    } catch (e) {
      console.log('[QrScanner] Failed to decode, trying rotations...');
    }

    // Try rotations: 90, 180, 270 degrees
    const rotations = [90, 180, 270];
    
    for (const degrees of rotations) {
      try {
        // Rotate the image
        const radians = degrees * Math.PI / 180;
        canvas.width = degrees === 90 || degrees === 270 ? img.height : img.width;
        canvas.height = degrees === 90 || degrees === 270 ? img.width : img.height;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
        
        const rotatedUrl = canvas.toDataURL();
        const rotatedImg = document.createElement('img');
        rotatedImg.src = rotatedUrl;
        await new Promise(resolve => { rotatedImg.onload = resolve; });
        
        const result = await reader.decodeFromImageElement(rotatedImg);
        console.log(`[QrScanner] Decoded with ${degrees}° rotation`);
        return result;
      } catch (err) {
        console.log(`[QrScanner] Failed with ${degrees}° rotation`);
      }
    }

    throw new NotFoundException();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('[QrScanner] Processing uploaded file:', file.name, file.size);
    setError('');
    setStatus('Analisando imagem...');
    setScanning(true);
    
    try {
      const reader = createOptimizedReader();
      const imageUrl = URL.createObjectURL(file);
      
      try {
        const result = await tryDecodeWithRotations(reader, imageUrl);
        console.log('[QrScanner] File upload result:', result.text.substring(0, 100));
        handleResult(result.text);
      } finally {
        URL.revokeObjectURL(imageUrl);
      }
    } catch (err) {
      console.error('[QrScanner] File Upload QR Error:', err);
      if (err instanceof NotFoundException) {
        setError('Não foi possível encontrar um QR Code na imagem. Tente outra foto com melhor iluminação e foco.');
      } else {
        setError('Erro ao ler o QR Code da imagem. Tente novamente.');
      }
    } finally {
      if (mountedRef.current) {
        setScanning(false);
        setStatus('');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResult = (text) => {
    console.log('[QrScanner] Processing result:', text.substring(0, 100));
    
    const validation = validateNFCeText(text);
    
    if (validation.valid) {
      console.log('[QrScanner] Valid NFC-e detected:', validation.type);
      setStatus('NFC-e detectada! Processando...');
      toast.success('NFC-e detectada com sucesso!');
      stopCamera();
      onScan(validation.value);
    } else {
      console.log('[QrScanner] Invalid QR code rejected:', validation.reason);
      toast.error(validation.reason || 'QR Code não parece ser uma NFC-e válida');
      setLastScanAttempts(prev => prev + 1);
      
      if (lastScanAttempts >= 2) {
        setStatus('Tente aproximar mais ou ajustar a iluminação');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Ler QR Code da NFC-e</h3>
          <button
            onClick={() => {
              handleStopCamera();
              onClose();
            }}
            className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-400/10 text-red-400 text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {status && !error && (
            <div className="p-3 rounded-lg bg-primary/10 text-primary text-sm flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{status}</span>
            </div>
          )}

          {isCameraActive ? (
            <div className="space-y-4">
              <div className="relative aspect-square w-full bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-primary/50 rounded-xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
                
                {/* Camera switch button if multiple cameras */}
                {hasMultipleCameras && (
                  <button
                    onClick={switchCamera}
                    className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleStopCamera}
                  className="flex-1 gap-2"
                >
                  <X className="h-4 w-4" />
                  Parar Câmera
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Always render the video element (hidden) so ref can be set */}
              <div className="hidden">
                <video ref={videoRef} playsInline muted />
              </div>
              
              <Button
                onClick={() => handleStartCamera()}
                disabled={scanning}
                className="w-full gap-2"
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Abrir Câmera
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <label className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors bg-background/30">
                {scanning ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {scanning ? 'Processando...' : 'Fazer upload de imagem'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG até 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={scanning}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
