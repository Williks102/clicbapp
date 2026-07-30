'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, Camera, Loader2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/*
 * Ces deux variables sont lues littéralement : Next.js remplace
 * `process.env.NEXT_PUBLIC_*` par sa valeur au moment du build, ce qu'un accès
 * calculé empêcherait.
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Envoi d'images vers Cloudinary.
 *
 * L'implémentation précédente s'appuyait sur le widget officiel, qui ouvre son
 * sélecteur de fichiers dans une iframe tierce. Les navigateurs mobiles
 * bloquent fréquemment cette ouverture : le bouton « Browse » ne produisait
 * aucun effet, sans message ni erreur. Le « mode ordinateur » n'y change rien,
 * il ne modifie que l'agent utilisateur.
 *
 * Ici, l'`<input type="file">` appartient à notre page : le sélecteur est celui
 * du système, et l'envoi est une simple requête vers l'API d'upload non signé.
 * Plus d'iframe, plus de script externe, donc plus de dépendance à la Content
 * Security Policy pour l'affichage du sélecteur.
 */

type ImageUploaderProps = {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  /** Dossier Cloudinary de destination. */
  folder?: string;
  /** Aperçu carré pour les portraits de candidats. */
  aspect?: 'video' | 'square';
};

export function ImageUploader({
  value,
  onChange,
  onRemove,
  folder = 'competitions',
  aspect = 'video',
}: ImageUploaderProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function upload(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError('Format non pris en charge. Utilisez un fichier PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      const size = (file.size / 1024 / 1024).toFixed(1);
      setError(`Image trop lourde (${size} Mo). La limite est de 5 Mo.`);
      return;
    }

    setUploading(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', UPLOAD_PRESET!);
      body.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body }
      );

      const payload = (await response.json()) as {
        secure_url?: string;
        error?: { message?: string };
      };

      if (!response.ok || !payload.secure_url) {
        // Cloudinary explique la cause : preset introuvable, preset signé,
        // format refusé… Le message brut est plus utile qu'un texte générique.
        throw new Error(payload.error?.message ?? `Cloudinary a répondu ${response.status}.`);
      }

      onChange(payload.secure_url);
    } catch (uploadError) {
      console.error('[Cloudinary] ❌ Envoi échoué :', uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "L'envoi de l'image a échoué. Réessayez."
      );
    } finally {
      setUploading(false);
      // Permet de re-sélectionner le même fichier après une erreur.
      if (fileInput.current) fileInput.current.value = '';
      if (cameraInput.current) cameraInput.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      {value ? (
        <div
          className={`relative w-full overflow-hidden rounded-lg border ${
            aspect === 'square' ? 'aspect-square max-w-[240px]' : 'aspect-video'
          }`}
        >
          <Image src={value} alt="Image envoyée" fill className="object-cover" />
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

      {/*
        Deux champs distincts : `capture` demande à un mobile d'ouvrir
        directement l'appareil photo, ce qui empêcherait de parcourir la
        galerie s'il était posé sur le champ principal.
      */}
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? 'Envoi en cours…' : value ? "Changer l'image" : 'Choisir une image'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInput.current?.click()}
          disabled={uploading}
          className="w-full sm:w-auto"
        >
          <Camera className="mr-2 h-4 w-4" />
          Photo
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        PNG, JPG, WEBP. Max 5 Mo. Format{' '}
        {aspect === 'square' ? 'carré (1:1)' : '16:9'} recommandé.
      </p>
    </div>
  );
}
