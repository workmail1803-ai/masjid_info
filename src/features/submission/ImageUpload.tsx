'use client';

import { useState, useCallback, useRef } from 'react';

interface ImageUploadProps {
  maxFiles?: number;
  maxSizeMb?: number;
}

export function ImageUpload({ maxFiles = 3, maxSizeMb = 5 }: ImageUploadProps) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setError('');

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = maxSizeMb * 1024 * 1024;
    const newPreviews: { file: File; url: string }[] = [...previews];

    for (let i = 0; i < files.length; i++) {
      if (newPreviews.length >= maxFiles) {
        setError(`সর্বোচ্চ ${maxFiles}টি ছবি যোগ করা যাবে।`);
        break;
      }

      const file = files[i];
      if (!allowed.includes(file.type)) {
        setError('শুধুমাত্র JPG, PNG, বা WebP ফাইল গ্রহণযোগ্য।');
        continue;
      }
      if (file.size > maxBytes) {
        setError(`প্রতিটি ছবি সর্বোচ্চ ${maxSizeMb}MB হতে পারে।`);
        continue;
      }

      newPreviews.push({ file, url: URL.createObjectURL(file) });
    }

    setPreviews(newPreviews);
  }, [previews, maxFiles, maxSizeMb]);

  const removeImage = useCallback((index: number) => {
    setPreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  return (
    <div className="space-y-3">
      {/* Hidden file inputs — name them so FormData picks them up */}
      <input
        ref={inputRef}
        type="file"
        name="images"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent hover:bg-surface-alt/50 transition-colors"
      >
        <div className="text-3xl mb-2">📷</div>
        <p className="text-sm text-ink-muted">ছবি টেনে আনুন বা ক্লিক করুন</p>
        <p className="text-xs text-ink-faint mt-1">
          JPG, PNG, বা WebP • সর্বোচ্চ {maxSizeMb}MB • সর্বোচ্চ {maxFiles}টি ছবি
        </p>
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((p, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3]">
              <img src={p.url} alt={`ছবি ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
