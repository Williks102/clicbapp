'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { EyeOff, Loader2, MessageCircle, Send, ShieldBan } from 'lucide-react';

import { useCollection, useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DataError } from '@/components/data-error';
import { useToast } from '@/hooks/use-toast';
import { banUserFromChat, hideChatMessage, sendChatMessage } from '@/app/actions/chat-actions';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

const MESSAGE_LIMIT = 100;

type LiveChatProps = {
  competitionId: string;
  /** Active les outils de modération (organisateur du concours ou admin). */
  canModerate?: boolean;
  className?: string;
};

export function LiveChat({ competitionId, canModerate = false, className }: LiveChatProps) {
  const { data: session } = useSession();
  const { areServicesAvailable, firestore } = useFirebase();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemo(
    () =>
      areServicesAvailable && firestore
        ? query(
            collection(firestore, 'chatMessages'),
            where('competitionId', '==', competitionId),
            orderBy('createdAt', 'desc'),
            limit(MESSAGE_LIMIT)
          )
        : null,
    [areServicesAvailable, firestore, competitionId]
  );

  const {
    data: messages,
    isLoading,
    error,
  } = useCollection<ChatMessage>(messagesQuery);

  // La requête descend du plus récent : on ré-inverse pour un fil chronologique.
  const orderedMessages = useMemo(() => {
    if (!messages) return [];
    const visible = canModerate ? messages : messages.filter((m) => !m.hidden);
    return [...visible].reverse();
  }, [messages, canModerate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orderedMessages.length]);

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;

    startTransition(async () => {
      const result = await sendChatMessage(competitionId, message);
      if (result.success) {
        setDraft('');
      } else {
        toast({
          title: 'Message non envoyé',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  const handleHide = (messageId: string) => {
    startTransition(async () => {
      const result = await hideChatMessage(competitionId, messageId);
      toast({
        title: result.success ? 'Message masqué' : 'Action impossible',
        description: result.success ? undefined : result.error,
        variant: result.success ? undefined : 'destructive',
      });
    });
  };

  const handleBan = (userId: string) => {
    startTransition(async () => {
      const result = await banUserFromChat(competitionId, userId);
      toast({
        title: result.success ? 'Spectateur banni' : 'Action impossible',
        description: result.success ? undefined : result.error,
        variant: result.success ? undefined : 'destructive',
      });
    });
  };

  return (
    <Card className={cn('flex h-[520px] flex-col', className)}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-primary" />
          Chat du direct
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 pb-4">
        <ScrollArea className="min-h-0 flex-1 pr-3">
          {isLoading && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          <DataError error={error} subject="le chat" />

          {!isLoading && !error && orderedMessages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun message pour l&apos;instant. Lancez la conversation !
            </p>
          )}

          <div className="space-y-3">
            {orderedMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'group rounded-lg px-2 py-1.5 text-sm',
                  message.hidden && 'opacity-50',
                  message.userId === session?.user?.id && 'bg-primary/5'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{message.userName}</span>
                  {message.userRole === 'organizer' && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      Organisateur
                    </Badge>
                  )}
                  {message.userRole === 'admin' && (
                    <Badge className="h-4 px-1.5 text-[10px]">Modérateur</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {canModerate && (
                    <span className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!message.hidden && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          title="Masquer le message"
                          onClick={() => handleHide(message.id)}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        title="Bannir le spectateur"
                        onClick={() => handleBan(message.userId)}
                      >
                        <ShieldBan className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  )}
                </div>
                <p className="mt-0.5 break-words text-muted-foreground">
                  {message.message}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {session ? (
          <form onSubmit={handleSend} className="flex shrink-0 gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Votre message…"
              maxLength={300}
              disabled={isPending}
            />
            <Button type="submit" size="icon" disabled={isPending || !draft.trim()}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Envoyer</span>
            </Button>
          </form>
        ) : (
          <Button variant="outline" className="shrink-0" asChild>
            <Link href={`/login?callbackUrl=/competitions/${competitionId}/live`}>
              Connectez-vous pour participer au chat
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
