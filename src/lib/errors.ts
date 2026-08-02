/**
 * Erreurs destinées à l'utilisateur.
 *
 * Les actions renvoyaient jusqu'ici `error.message` tel quel. Or ce message
 * vient aussi bien d'un refus délibéré — « Vous n'êtes pas autorisé à modifier
 * ce concours. » — que de PostgreSQL, qui nomme volontiers la contrainte, la
 * colonne ou la relation en cause. Une erreur d'écriture livrait donc la
 * structure de la base à qui savait la provoquer.
 *
 * La distinction devient explicite : seul ce qui est levé comme
 * `UserFacingError` est montré. Le reste est journalisé côté serveur et
 * remplacé par un message neutre.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

/**
 * Message à afficher pour cette erreur.
 *
 * `fallback` doit rester générique : il couvre par construction les causes
 * qu'on ne maîtrise pas.
 */
export function userMessage(error: unknown, fallback: string): string {
  return error instanceof UserFacingError ? error.message : fallback;
}
