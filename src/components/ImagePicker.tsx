import { useState, useRef } from 'react';
import { ImagePlus, FolderOpen } from 'lucide-react';
import { useProjects } from '@/lib/ProjectsContext';

interface ImagePickerProps {
  selectedImage: string | null;
  onImageSelect: (dataUrl: string) => void;
  onClear: () => void;
}

export default function ImagePicker({ selectedImage, onImageSelect, onClear }: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showProjects, setShowProjects] = useState(false);
  const { projects } = useProjects();

  const projectImages = projects
    .filter(p => p.generatedImageUrl)
    .map(p => ({ id: p.id, title: p.title, url: p.generatedImageUrl! }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onImageSelect(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (selectedImage) {
    return (
      <div className="relative rounded-2xl border border-border overflow-hidden">
        <img src={selectedImage} alt="Selected" className="w-full h-40 object-cover" />
        <button
          onClick={onClear}
          className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground rounded-full px-3 py-1 text-xs font-semibold"
        >
          تغيير ✕
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-4 text-sm font-semibold text-foreground hover:border-primary/30 transition-all"
        >
          <ImagePlus className="h-5 w-5 text-primary" />
          اختر من المعرض
        </button>
        {projectImages.length > 0 && (
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-4 text-sm font-semibold text-foreground hover:border-primary/30 transition-all"
          >
            <FolderOpen className="h-5 w-5 text-primary" />
            من مشاريعي
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {showProjects && (
        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto rounded-xl border border-border p-2 bg-card">
          {projectImages.map(img => (
            <button
              key={img.id}
              onClick={() => { onImageSelect(img.url); setShowProjects(false); }}
              className="rounded-lg overflow-hidden border border-border hover:border-primary transition-all"
            >
              <img src={img.url} alt={img.title} className="w-full h-20 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
