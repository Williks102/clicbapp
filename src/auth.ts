
import NextAuth from 'next-auth';

// Le contenu sera ajouté dans les prochaines étapes
export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [],
});
