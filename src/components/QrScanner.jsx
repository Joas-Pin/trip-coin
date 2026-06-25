import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { X, Camera, Upload, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { extractChaveAcesso } from '@/api/comprovantes';
import { toast } from 'sonner';

export default function QrScanner({ onScan, onClose }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleStartCamera = async () => {
    setError('');
    setScanning(true);
    try {
      codeReaderRef.current = new BrowserQRCodeReader();
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            handleResult(result.text);
          }
          if (err) {
            // Ignore NotFoundException-like errors
            if (err.name !== 'NotFoundException') {
              console.error(err);
            }
          }
        }
      );
      setIsCameraActive(true);
    } catch (err) {
      setError('Erro ao acessar a câmera. Verifique as permissões.');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleStopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError('');
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageElement(
        URL.createObjectURL(file)
      );
      handleResult(result.text);
    } catch (err) {
      if (err.name === 'NotFoundException' || err.message?.includes('not found')) {
        setError('Não foi possível encontrar um QR Code na imagem.');
      } else {
        setError('Erro ao ler o QR Code. Tente novamente.');
      }
      console.error(err);
    } finally {
      setScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleResult = (text) => {
    const chave = extractChaveAcesso(text);
    
    if (chave) {
      handleStopCamera();
      onScan(chave, text);
    } else {
      toast.error('QR Code não parece ser uma NFC-e válida');
    }
  };

  useEffect(() => {
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
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
            className="p-2 rounded-lg hover:bg-accent/10"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-400/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          {isCameraActive ? (
            <div className="space-y-4">
              <div className="relative aspect-square w-full bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-primary/50 rounded-xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-dashed border-primary" />
              </div>
              <Button
                variant="destructive"
                onClick={handleStopCamera}
                className="w-full"
              >
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
