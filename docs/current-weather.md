# Météo actuelle et ciel animé — v1.3 en préparation

Le bandeau affiche la météo actuelle à droite de la synthèse : condition, température et ressenti. Le décor suit le soleil, les nuages, la pluie, les orages, la neige, la grêle, le brouillard et le vent. Sur mobile, cette partie passe sous le texte de synthèse, dans le même bandeau.

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

Les animations du ciel se mettent en pause hors écran et quand l’onglet est masqué. La préférence système « réduire les mouvements » affiche un décor fixe. Les orages ont un éclair à lueur lente, sans flash plein écran.

## Aperçu et vérifications

Depuis le dépôt, `npm run preview:weather` ouvre un serveur local d’aperçu. La page propose des conditions simulées, les thèmes clair/sombre, le jour/la nuit, le mode allégé et une largeur mobile. Elle ne se connecte pas à Home Assistant.

Les contrôles couvrent les sources, conversions d’unités, données manquantes, toutes les conditions, les thèmes et les largeurs 375/768/1440 px, les liens de sources au clavier et les pauses d’animation. Les performances sur votre tablette et le rendu de votre thème restent à vérifier en situation.

Le ciel est une réalisation CSS propre à Niak Weather, inspirée du principe de ciel vivant de [Dynamic Weather Card](https://github.com/teuchezh/dynamic-weather-card). Il ne charge pas cette carte et ne télécharge aucune image ou animation distante.

Cette évolution est préparée sous le numéro **1.3.0-beta.1**. Elle n’est pas encore publiée dans HACS ; la version stable reste **1.2.0**.
