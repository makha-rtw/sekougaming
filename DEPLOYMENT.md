# Guide de Déploiement Gratuit — SEKOUGAMING

## ⚠️ Pourquoi Netlify seul ne convient pas pour Sekouno ?
Netlify est une plateforme d'hébergement statique / serverless (fonctions sans état qui s'éteignent après quelques secondes).
**Sekouno** intègre un serveur temps réel **Node.js + Socket.IO (WebSockets)** pour gérer les salons multijoueurs, l'état de la pioche, les tours de jeu et les pénalités. Une connexion WebSocket persistante nécessite un serveur en arrière-plan continu.

---

## 🚀 La solution idéale & 100% gratuite : Render.com

**Render** propose un plan **Web Service gratuit** qui supporte nativement :
- Node.js avec processus persistant
- WebSockets / Socket.IO complets
- HTTPS automatique avec sous-domaine gratuit (ex: `https://sekou-gaming.onrender.com`)
- Déploiement automatique dès que vous poussez sur GitHub

Notre projet est configuré en **application unifiée** : le serveur Express sert à la fois le client web compilé (Vite PWA) et les WebSockets sur le même port.

---

## 📋 Étapes de déploiement sur Render (en 3 minutes)

### 1. Pousser votre projet sur GitHub
Si ce n'est pas déjà fait :
```bash
git add .
git commit -m "Déploiement SEKOUGAMING avec Sekouno et Loup-Garou"
git push origin main
```

### 2. Créer un compte gratuit sur [Render.com](https://render.com)
Connectez-vous avec votre compte GitHub.

### 3. Créer un nouveau Web Service
1. Cliquez sur le bouton **New +** > **Web Service**.
2. Sélectionnez votre dépôt GitHub `sekou-gaming-Sekouno`.
3. Remplissez les champs de configuration :
   - **Name** : `sekou-gaming` (ou le nom de votre choix)
   - **Region** : Frankfurt (EU Central) ou Oregon (US West)
   - **Branch** : `main`
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free`
4. Cliquez sur **Deploy Web Service**.

### 4. C'est prêt ! 🎉
Render va cloner votre code, compiler le serveur et le client, puis démarrer l'application.
Vous obtiendrez une URL en `https://sekou-gaming.onrender.com` que vous pourrez partager directement avec vos amis pour jouer sur smartphone ou ordinateur !
