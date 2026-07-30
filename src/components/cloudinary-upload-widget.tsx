'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { AlertTriangle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

/*
 * Ces deux variables sont lues littéralement : Next.js remplace
 * `process.env.NEXT_PUBLIC_*` par sa valeur au moment du build, ce qu'un accès
 * calculé empêcherait.
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type CloudinaryUploadWidgetProps = {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  /** Dossier Cloudinary de destination. */
  folder?: string;
  /** Aperçu carré pour les portraits de candidats. */
  aspect?: 'video' | 'square';
};

export function CloudinaryUploadWidget({
  value,
  onChange,
  onRemove,
  folder = 'competitions',
  aspect = 'video',
}: CloudinaryUploadWidgetProps) {
  /*
   * `CldUploadWidget` lève une exception pendant son rendu quand le nom du
   * cloud est absent. Sans ce garde-fou, une variable d'environnement oubliée
   * ne se traduit pas par un bouton inactif mais par la page entière qui
   * tombe — la gestion des candidats devenait inaccessible.
   */
  const missing = [
    !CLOUD_NAME && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    !UPLOAD_PRESET && 'NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET',
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Envoi d'images indisponible</AlertTitle>
        <AlertDescription>
          <p>
            {missing.length > 1 ? 'Les variables' : 'La variable'}{' '}
            {missing.map((name, index) => (
              <span key={name}>
                {index > 0 && ' et '}
                <code className="font-mono text-xs">{name}</code>
              </span>
            ))}{' '}
            {missing.length > 1 ? 'sont absentes' : 'est absente'} de la configuration.
          </p>
          <p className="mt-2">
            Ajoutez-{missing.length > 1 ? 'les' : 'la'} chez votre hébergeur puis relancez un
            déploiement : les variables <code className="font-mono text-xs">NEXT_PUBLIC_</code>{' '}
            sont intégrées au build et ne sont pas prises en compte avant reconstruction.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {value ? (
        <div
          className={`relative w-full overflow-hidden rounded-lg border ${
            aspect === 'square' ? 'aspect-square max-w-[240px]' : 'aspect-video'
          }`}
        >
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
        uploadPreset={UPLOAD_PRESET}
        onSuccess={(result) => {
          // `info` est typé large : il peut porter une chaîne selon l'événement.
          const url = (result.info as { secure_url?: string } | undefined)?.secure_url;
          if (url) onChange(url);
        }}
        onError={(error) => {
          console.error('[Cloudinary] ❌ Envoi échoué :', error);
        }}
        options={{
          maxFiles: 1,
          maxFileSize: 5000000, // 5MB
          sources: ['local', 'camera', 'url'],
          cropping: false, // ✅ Pas de cropping forcé
          // croppingAspectRatio: 16 / 9, // Désactivé
         showSkipCropButton: true, // Optionnel si cropping activé
          folder,
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
        PNG, JPG, WEBP. Max 5 Mo. Format{' '}
        {aspect === 'square' ? 'carré (1:1)' : '16:9'} recommandé.
      </p>
    </div>
  );
}