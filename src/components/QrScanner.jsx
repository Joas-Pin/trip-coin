import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader, NotFoundException } from '@zxing/library';
import { X, Camera, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { extractChaveAcesso } from '@/api/comprovantes';
import { toast } from 'sonner';

export default function QrScanner({ onScan, onClose }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleStartCamera = async () => {
    setError('');
    setStatus('Acessando câmera...');
    setScanning(true);
    try {
      // Initialize QR code reader
      codeReaderRef.current = new BrowserQRCodeReader(
        {
          delayBetweenScanAttempts: 300, // ms
          tryHarder: true,
          tryHarderWithoutRotation: false,
        },
        {
          audio: false,
        }
      );

      // Ensure video element is mounted before accessing
      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado');
      }

      // Request camera and start decoding
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result, err) => {
          if (result) {
            handleResult(result.text);
          }
          if (err) {
            // Ignore "not found" errors as they're expected while scanning
            if (err instanceof NotFoundException) {
              return;
            }
            console.error('QR Scan Error:', err);
          }
        }
      );

      setStatus('Aponte o QR Code da NFC-e para a câmera');
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera Error:', err);
      
      // Handle specific camera errors
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        setError('Permissão da câmera negada. Por favor, conceda acesso nas configurações do navegador.');
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        setError('Nenhuma câmera encontrada. Conecte uma câmera e tente novamente.');
      } else if (err.name === 'NotReadableError' || err.message?.includes('not readable')) {
        setError('Câmera está em uso por outro aplicativo. Feche outros apps e tente novamente.');
      } else if (err.name === 'OverconstrainedError') {
        setError('Câmera não suporta as configurações solicitadas.');
      } else {
        setError(`Erro ao acessar a câmera: ${err.message || 'Tente novamente.'}`);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleStopCamera = () => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    } catch (e) {
      console.error('Error stopping camera:', e);
    }
    setIsCameraActive(false);
    setStatus('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError('');
    setStatus('Analisando imagem...');
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageElement(URL.createObjectURL(file));
      handleResult(result.text);
    } catch (err) {
      console.error('File Upload QR Error:', err);
      if (err instanceof NotFoundException) {
        setError('Não foi possível encontrar um QR Code na imagem. Tente outra foto com melhor iluminação e foco.');
      } else {
        setError('Erro ao ler o QR Code da imagem. Tente novamente.');
      }
    } finally {
      setScanning(false);
      setStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResult = (text) => {
    const chave = extractChaveAcesso(text);
    
    if (chave) {
      setStatus('NFC-e detectada! Processando...');
      toast.success('NFC-e detectada com sucesso!');
      handleStopCamera();
      onScan(chave, text);
    } else {
      toast.error('QR Code não parece ser uma NFC-e válida');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, []);

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
              </div>
              <Button
                variant="destructive"
                onClick={handleStopCamera}
                className="w-full gap-2"
              >
                <X className="h-4 w-4" />
                Parar Câmera
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleStartCamera}
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
