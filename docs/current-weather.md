# Météo actuelle et ciel animé — v1.3.0

Le bandeau affiche la météo actuelle à droite de la synthèse : condition et température. Le ressenti reste dans la synthèse et sa jauge, sans répétition dans le bloc de droite. L’origine du ciel est accessible au survol de la condition et par un clic sur sa source.

Le décor couvre toute la largeur et toute la hauteur du bandeau, y compris lorsque « Les points à retenir » est déplié. Un voile aux couleurs du thème, posé au-dessus du ciel, s’efface progressivement de gauche à droite pour préserver la lisibilité de la synthèse. Sur mobile, la météo actuelle passe sous le texte de synthèse et le voile s’adapte verticalement.

Les nuages sont des silhouettes vectorielles simples à deux tons. La pluie a plusieurs profondeurs et vitesses ; les fortes pluies sont plus denses, rapides et inclinées. Les orages produisent des éclairs ramifiés brefs à deux endroits de la scène. Le vent fait traverser le ciel aux filets d’air et aux feuilles, avec des nuages plus mobiles.

## Origine des données

L’état actuel de l’entité `weather_entity` fournit le ciel du bulletin. Les prévisions horaires et les alertes de la synthèse ne changent pas ce décor. La station peut confirmer une pluie mesurée : dès 0,3 mm/h le décor affiche de la pluie, puis de fortes pluies à partir de 4 mm/h. Un pluviomètre explicitement choisi et disponible qui mesure 0 retire la pluie du décor du bulletin, avec la mention « sans pluie mesurée ». Il ne permet pas d’exclure la neige, la grêle ou un orage. Une valeur indisponible ne vaut pas zéro.

La température vient du thermomètre configuré. Sans thermomètre, elle utilise le modèle personnalisé choisi, ou à défaut la température du bulletin. La source est indiquée et un clic ouvre son entité. Un thermomètre sélectionné mais indisponible n’est pas remplacé silencieusement. Le ressenti reste celui du modèle Niak Weather et de ses contributions.

Le jour, le crépuscule et la nuit suivent l’élévation solaire configurée ou `sun.sun`. Sans ces informations, la carte peut utiliser la condition `clear-night` ou l’attribut `is_daytime` du fournisseur. Elle n’invente pas des horaires de lever et coucher. La lune est illustrative et ne représente pas sa phase astronomique.

Le code couleur d’attention et le halo de la synthèse conservent leur signification. La couleur du ciel représente seulement la météo actuelle.

## Réglages

L’éditeur propose **Météo actuelle et ciel animé** :

- **Animer le ciel** : activé par défaut ; désactivé, le décor devient fixe.
- **Qualité** : Standard ou Allégée, avec moins de particules et de nuages pour les tablettes.

En YAML :

```yaml
weather_animations: true
weather_animation_quality: standard
```

Les animations du ciel se mettent en pause hors écran et quand l’onglet est masqué. La préférence système « réduire les mouvements » affiche un décor fixe. Les éclairs apparaissent alternativement toutes les quatre secondes, avec une lueur localisée ; il n’y a pas de flash plein écran. En mode fixe, leur silhouette reste visible.

## Aperçu et vérifications

Depuis le dépôt, `npm run preview:weather` ouvre un serveur local d’aperçu. La page propose des conditions simulées, les thèmes clair/sombre, le jour/la nuit, le mode allégé et une largeur mobile. Elle ne se connecte pas à Home Assistant.

Les contrôles couvrent les sources, conversions d’unités, données manquantes, toutes les conditions, les thèmes et les largeurs 375/768/1440 px, les liens de sources au clavier et les pauses d’animation. Les performances sur votre tablette et le rendu de votre thème restent à vérifier en situation.

Le ciel est une réalisation CSS propre à Niak Weather, inspirée du principe de ciel vivant de [Dynamic Weather Card](https://github.com/teuchezh/dynamic-weather-card). Il ne charge pas cette carte et ne télécharge aucune image ou animation distante.

Cette évolution est disponible dans la version stable **1.3.0**. Mettez à jour Niak Weather dans HACS puis rechargez votre navigateur. Vos entités et réglages sont conservés.
