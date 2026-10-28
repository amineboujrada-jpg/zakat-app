# Zakat

Gestion de mes comptes et de l'argent qu'on me doit, avec **calcul automatique de la zakat** (école malikite).

- Appli : https://amineboujrada-jpg.github.io/zakat-app/
- Technologie : HTML/CSS/JavaScript sans framework (PWA installable sur l'écran d'accueil, marche hors ligne), base locale IndexedDB.
- Serveur (optionnel) : Supabase — compte email + mot de passe, connexion Face ID (passkeys), base PostgreSQL protégée par RLS. Schéma : `supabase/schema.sql`.

## Fonctions
- **Comptes** : banques (LCL, Boursorama, Fortuneo, Revolut, Wise, PayPal, CIH…), espèces, or, argent, crypto. Total en euros et en dirhams.
- **Crédits** : argent prêté, date de remboursement prévue, risque de non-remboursement, alertes, remboursements avec crédit d'un compte.
- **Zakat** : calcul automatique (nisab or 85 g ou argent 595 g, cours du jour), zakat sur les remboursements reçus, versements par catégorie de bénéficiaires, dettes.
- Cours de l'or, de l'argent et des devises récupérés chaque jour (exchange-api, gratuit, sans clé).

## Mettre en ligne
GitHub → Settings → Pages → Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.

## Activer le compte et Face ID
1. Créer un projet Supabase et exécuter `supabase/schema.sql` dans l'éditeur SQL.
2. Authentication → URL Configuration : Site URL = l'adresse de l'appli.
3. Activer les passkeys (Face ID) dans les réglages d'authentification.
4. Mettre l'URL du projet et la clé publique dans `config.js`.

Sans `config.js` rempli, l'appli fonctionne en **mode local** (données sur l'appareil uniquement).

## Tests du moteur de calcul
```bash
node --test tests/*.test.js
```

## Mettre à jour
Changer `VERSION` dans `sw.js` à chaque nouvelle version pour que les téléphones la récupèrent.

Les règles de calcul suivent l'école malikite telles que documentées ; en cas de doute, demander l'avis d'un savant.
