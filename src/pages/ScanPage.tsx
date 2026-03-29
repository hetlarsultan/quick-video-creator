import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      setResult(null);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setResult(decodedText);
          toast.success('تم مسح الرمز بنجاح!');
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      toast.error('لا يمكن الوصول للكاميرا. تأكد من منح الإذن.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="px-5 pb-24 pt-8">
      <h1 className="text-2xl font-black text-foreground">ماسح الرموز</h1>
      <p className="mt-2 text-sm text-muted-foreground">امسح رموز QR أو الباركود بالكاميرا.</p>

      <div className="mt-6 rounded-2xl bg-card border border-border overflow-hidden">
        <div id="qr-reader" ref={containerRef} className="w-full" style={{ minHeight: scanning ? 300 : 0 }} />
        
        {!scanning && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center mb-6">اضغط الزر لبدء المسح</p>
            <button
              onClick={startScanner}
              className="gradient-primary rounded-2xl px-8 py-3 text-sm font-bold text-primary-foreground flex items-center gap-2 glow-primary hover:scale-[1.02] transition-all"
            >
              <ScanLine className="h-4 w-4" />
              بدء المسح
            </button>
          </div>
        )}

        {scanning && (
          <div className="p-4">
            <button
              onClick={stopScanner}
              className="w-full rounded-xl bg-destructive py-3 text-sm font-bold text-destructive-foreground flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              إيقاف المسح
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-5 rounded-2xl bg-card border border-border p-4 animate-slide-up">
          <h3 className="text-sm font-bold text-foreground mb-2">النتيجة:</h3>
          <p className="text-sm text-primary break-all select-all bg-secondary/50 rounded-xl p-3">{result}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(result);
                toast.success('تم النسخ!');
              }}
              className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground"
            >
              نسخ
            </button>
            {result.startsWith('http') && (
              <a
                href={result}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-secondary py-2 text-sm font-semibold text-foreground text-center"
              >
                فتح الرابط
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
