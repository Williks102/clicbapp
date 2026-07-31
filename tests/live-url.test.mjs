const { checkLiveUrl } = await import('../src/lib/live-url.ts');

let ko = 0;
const check = (label, cond) => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
  if (!cond) ko++;
};

const ok = (provider, url) => checkLiveUrl(provider, url).ok === true;
const ko_ = (provider, url) => checkLiveUrl(provider, url).ok === false;

console.log('Adresses refusées quel que soit le fournisseur :');
check('javascript: refusé', ko_('iframe', 'javascript:alert(document.cookie)'));
check('data: refusé', ko_('iframe', 'data:text/html,<script>alert(1)</script>'));
check('http en clair refusé', ko_('youtube', 'http://www.youtube.com/watch?v=dQw4w9WgXcQ'));
check('adresse illisible refusée', ko_('youtube', 'pas une url'));

console.log('\nHôtes hors de la Content Security Policy :');
check('domaine arbitraire refusé en iframe', ko_('iframe', 'https://exemple-malveillant.ci/page'));
check('sous-domaine trompeur refusé',
  ko_('youtube', 'https://www.youtube.com.exemple.ci/watch?v=dQw4w9WgXcQ'));
check('hôte non listé refusé pour vimeo', ko_('vimeo', 'https://vimeo.exemple.ci/video/123456'));

console.log('\nYouTube :');
check('watch?v= accepté', ok('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
check('youtu.be accepté', ok('youtube', 'https://youtu.be/dQw4w9WgXcQ'));
check('/live/ accepté', ok('youtube', 'https://www.youtube.com/live/dQw4w9WgXcQ'));
check('sans identifiant refusé', ko_('youtube', 'https://www.youtube.com/'));

console.log('\nVimeo et Facebook :');
check('vimeo numérique accepté', ok('vimeo', 'https://vimeo.com/123456789'));
check('vimeo sans identifiant refusé', ko_('vimeo', 'https://vimeo.com/mon-profil'));
check('facebook accepté', ok('facebook', 'https://www.facebook.com/page/videos/123456789'));

console.log('\nHLS :');
check('flux .m3u8 accepté', ok('hls', 'https://cdn.exemple.ci/live/stream.m3u8'));
check('.m3u8 avec paramètres accepté', ok('hls', 'https://cdn.exemple.ci/live/s.m3u8?token=abc'));
check('mp4 refusé', ko_('hls', 'https://cdn.exemple.ci/live/stream.mp4'));
check('flux HLS en http refusé', ko_('hls', 'http://cdn.exemple.ci/live/stream.m3u8'));

console.log('\nAdresse vide :');
check('vide acceptée (direct pas encore configuré)', ok('youtube', ''));
check('espaces seuls acceptés', ok('youtube', '   '));

console.log('\nMessage d’erreur :');
const refused = checkLiveUrl('youtube', 'https://exemple.ci/video');
check('une cause est fournie', refused.ok === false && typeof refused.error === 'string' && refused.error.length > 0);

console.log('\nMessage d’aide quand la plateforme ne correspond pas :');
const mismatch = checkLiveUrl('youtube', 'https://www.facebook.com/page/videos/12345');
check('la bonne plateforme est nommée',
  mismatch.ok === false && /Facebook Live/.test(mismatch.error));
const custom = checkLiveUrl('youtube', 'https://stream.exemple.ci/live');
check('le repli HLS est indiqué',
  custom.ok === false && /HLS/.test(custom.error));
check('un flux HLS sur un hébergeur quelconque reste accepté',
  checkLiveUrl('hls', 'https://stream.exemple.ci/live/master.m3u8').ok === true);

console.log(ko === 0 ? '\nToutes les vérifications passent.' : `\n${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
