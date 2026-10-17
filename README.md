# 🎮 SEKOU-GAMING — SEKOUNO

> **Version 1.0 — Réplique jouable en ligne et multijoueur en temps réel du UNO (2 à 15 joueurs)**

Sekouno est une application web responsive & Progressive Web App (PWA) permettant de jouer au UNO entre amis via des salons privés sans inscription ni compte utilisateur. Le serveur fait autorité sur toutes les règles du jeu, garantit la confidentialité absolue des cartes et gère les déconnexions/reconnexions.

---

## 🌟 Points Forts & Identité Visuelle

- **Identité propre à Sekouno** : Cartes colorées (Rouge, Bleu, Vert, Jaune, Noir) modernes et lisibles, animations fluides, contrastes soignés.
- **Mobile-first & PWA** : Installable sur smartphones et ordinateurs, interface tactile optimisée avec défilement horizontal fluide de la main.
- **De 2 à 15 joueurs en temps réel** : Génération et adaptation dynamique de la taille du paquet (1 à 3 jeux complets selon le nombre de participants).
- **Salons privés sans compte** : Création instantanée avec code court à 6 caractères, QR Code scannable et bouton de partage.
- **Autorité stricte côté serveur** : Aucune triche possible côté client, masquage des cartes adverses (seul le nombre de cartes est transmis).
- **Reconnexion transparente** : Utilisation d'un jeton de session temporaire stocké localement.

---

## 🃏 Règles Officielles du Moteur de Jeu

### Règle Personnalisée A — Impossible de finir avec une carte noire
- **Principe** : Un joueur **ne peut pas** remporter la partie en posant une carte noire (Changement de couleur ou +4) comme dernière carte.
- **Vérification serveur** : Si un joueur tente de jouer sa dernière carte et que celle-ci est noire, l'action est formellement rejetée par le serveur avec une notification claire : il doit piocher une carte à la place.
- Une carte noire reste jouable normalement si le joueur conserve au moins une autre carte après l'avoir posée.

### Règle Personnalisée B — Empilement des pénalités (+2 et +4)
- Les pénalités s'empilent dans un ordre **strictement croissant** :
  - Sur un **+2**, le joueur suivant peut contrer avec un **+2** ou un **+4**.
  - Sur un **+4**, un joueur **ne peut pas** répondre avec un **+2**.
  - De plus, une fois un **+4** posé, aucun empilement supplémentaire de **+4 sur +4** n'est autorisé.
- Si le joueur ne peut pas ou ne souhaite pas empiler, il pioche l'intégralité du cumul accumulé (+2, +4, +6, etc.) et perd son tour.

### Autres Règles Implémentées
- **Passe ton tour** : Saute le joueur suivant.
- **Inversion** : Inverse le sens de rotation (en partie à 2 joueurs, agit comme un passe-tour).
- **Changement de couleur** : Choix de la couleur active (Rouge, Bleu, Vert, Jaune).
- **Bouton UNO & Contre-UNO** : Un joueur ayant 1 ou 2 cartes peut déclarer UNO. Si un joueur se retrouve à 1 carte sans avoir déclaré UNO, n'importe quel adversaire peut cliquer sur **Contre-UNO** pour lui infliger 2 cartes de pénalité immédiates !
- **Reconstitution de la pioche** : Lorsque la pioche est épuisée, la défausse (sauf la carte visible du dessus) est automatiquement rebattue.

---

## 🚀 Commandes et Démarrage

### Prérequis
- **Node.js** : version 18+ (testé avec Node v24)
- **npm** : version 9+

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancement en Développement
Lance à la fois le serveur Express/Socket.IO (port 3001) et le client Vite (port 3000) avec rechargement à chaud :
```bash
npm run dev
```
Ouvrez ensuite [http://localhost:3000](http://localhost:3000) dans votre navigateur.

Pour lancer séparément :
- Serveur : `npm run dev:server`
- Client : `npm run dev:client`

### 3. Exécution des Tests Automatisés
Le projet intègre 22 tests automatisés (21 tests unitaires de règles et de gestion de salle + 1 test d'intégration multijoueur réel avec clients Socket.IO simultanés) :
```bash
npm test
```

### 4. Build de Production
Compile le client React/Tailwind dans `client/dist` et le serveur TypeScript dans `server/dist` :
```bash
npm run build
```

### 5. Démarrage en Production
```bash
npm start
```
Le serveur servira à la fois l'API Socket.IO et les fichiers statiques de l'application sur le port configuré (défaut : 3001).

---

## 🧪 Tests Automatisés Couverts

Les tests Vitest vérifient exhaustivement :
1. Création d’une salle et code alphanumérique unique.
2. Refus strict d’un 16e joueur (limite de 15 joueurs).
3. Refus de démarrer avec un nombre insuffisant de joueurs (< 2).
4. Distribution exacte de 7 cartes à chaque joueur (validé pour 2 et 15 joueurs avec adaptation du deck).
5. Confidentialité absolue de la main des autres joueurs (aucune fuite dans l'état public).
6. Refus de jouer une carte illégale.
7. Ordre des tours et inversion du sens.
8. Effet de Passe ton tour.
9. Effet de +2 initial.
10. Empilement de +2 sur +2 avec cumul (+4).
11. Empilement de +4 sur +2 avec cumul (+6).
12. Refus formel de poser un +2 sur un +4.
13. Refus formel de poser un +4 sur un +4 (respect de la progression strictement croissante).
14. Obligation de piocher toutes les cartes accumulées en cas d'impossibilité d'empiler.
15. Règle A : Interdiction formelle de gagner avec un Changement de couleur comme dernière carte.
16. Règle A : Interdiction formelle de gagner avec un +4 comme dernière carte.
17. Autorisation de jouer une carte noire si le joueur conserve au moins une autre carte.
18. Reconstitution automatique de la pioche par mélange de la défausse.
19. Détection de victoire et synchronisation du gagnant chez tous les joueurs.
20. Déconnexion et reconnexion d’un joueur avec restauration de session.
21. Protection contre les tentatives de triche (actions hors tour ou cartes non possédées).
22. Test d'intégration TCP avec 3 clients Socket.IO réels concurrents.

---

## 🌐 Contraintes et Exigences de Déploiement

- **Serveur persistant requis** : Comme Sekouno repose sur des connexions bidirectionnelles WebSocket/Socket.IO et un état des parties géré en mémoire, il nécessite un hébergement supportant les processus Node.js longue durée :
  - **Recommandé** : Render (Web Service), Railway, Fly.io, DigitalOcean App Platform, VPS Linux ou conteneur Docker.
  - **Incompatible pour le serveur** : Vercel Serverless, Cloudflare Pages ou GitHub Pages seuls ne peuvent pas maintenir les connexions WebSocket persistantes indispensables au multijoueur.
- **Variables d'environnement** :
  - `PORT` : Port d'écoute du serveur (par défaut `3001` en dev).
  - `CLIENT_URL` : Origine autorisée pour CORS en développement (`http://localhost:3000`). En production, laisser vide ou `*`.
