'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

type CloudinaryUploadWidgetProps = {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
};

export function CloudinaryUploadWidget({
  value,
  onChange,
  onRemove,
}: CloudinaryUploadWidgetProps) {
  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
          <Image
            src={value}
            alt="Image uploadée"
            fill
            className="object-cover"
          />
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : null}

      <CldUploadWidget
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!}
        onSuccess={(result: any) => {
          onChange(result.info.secure_url);
        }}
        options={{
          maxFiles: 1,
          maxFileSize: 5000000, // 5MB
          sources: ['local', 'camera', 'url'],
          cropping: false, // ✅ Pas de cropping forcé
          // croppingAspectRatio: 16 / 9, // Désactivé
          // showSkipCropButton: true, // Optionnel si cropping activé
          folder: 'events',
          clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
          maxImageWidth: 1920,
          maxImageHeight: 1080,
        }}
      >
        {({ open }) => (
          <Button
            type="button"
            variant="outline"
            onClick={() => open()}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {value ? 'Changer l\'image' : 'Télécharger une image'}
          </Button>
        )}
      </CldUploadWidget>

      <p className="text-xs text-muted-foreground">
        PNG, JPG, WEBP. Max 5MB. Format 16:9 recommandé.
      </p>
    </div>
  );
}