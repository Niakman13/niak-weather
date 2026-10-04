# Niak Weather v1.2.0-beta.3 — ressenti et synthèse plus lisibles

Cette bêta améliore la lisibilité sans modifier les seuils de la synthèse ni les entités choisies. **La v1.0.0 reste la version stable.**

## Les changements

- Le ressenti apparaît en grand au-dessus du curseur, dans la teinte du dégradé à sa position, ajustée pour rester lisible. La jauge occupe un cadre sur toute la largeur, avec la base humidex et les contributions disponibles et significatives du vent et du soleil. L’humidex n’est pas une correction à additionner une deuxième fois.
- Les indices air et pollens sont encadrés, aujourd’hui comme demain. Les disques en dégradé et le halo animé du bandeau sont conservés.
- Les titres Synthèse, Aujourd’hui et Prévisions sont agrandis et les sections davantage espacées.
- « Les points à retenir » remplace les longues explications par des points d’attention regroupés : vigilance officielle, maintenant, prochaines heures, air et pollens. Les sources restent accessibles ; les limites des données sont consultables séparément.
- Les compteurs de pluie sont nommés « Cette semaine » et « Ce mois », et non « 7 jours » et « 30 jours ». Ce sont les cumuls calendaires de la station, pas des périodes glissantes. Leurs valeurs et les réglages de remise à zéro de la station ne sont pas modifiés.

## Installer dans HACS

1. Sauvegarde le YAML de ta carte avant le test.
2. Ouvre **HACS → Niak Weather → ⋮ → Retélécharger / Redownload**.
3. Choisis **v1.2.0-beta.3**. Active l’affichage des préversions si ton interface le propose et que la bêta est masquée.
4. Télécharge puis recharge le tableau de bord avec **Ctrl+F5** ou **Cmd+Shift+R**. Dans l’application mobile, recharge le frontend ou réinitialise son cache si l’ancien rendu persiste.

Aucun redémarrage de Home Assistant n’est nécessaire. Les entités sont conservées. `smart_brief: false` désactive l’interprétation intelligente, sans annuler cette organisation visuelle.

Pour revenir à la stable, sélectionne **v1.0.0** dans le même dialogue, télécharge et recharge le navigateur. Restaure le YAML sauvegardé si nécessaire.

## Vérifications et limites

Les **158 tests automatisés** passent. Les contrôles navigateur couvrent 18 cas à 375, 768 et 1440 px en clair/sombre, ainsi que les valeurs extrêmes du ressenti sur mobile, les sources au clavier et les animations avec réduction des mouvements.

Ces contrôles ne constituent pas une validation sur votre installation Home Assistant, ni une certification complète d’accessibilité ou de performances. Les contrastes de tous les thèmes restent à éprouver. Les indices d’air et de pollens concernent une zone ; la carte ne remplace pas les consignes officielles.

[Mécanique de la synthèse, seuils et limites](https://github.com/Niakman13/niak-weather/blob/v1.2.0-beta.3/docs/brief-intelligent.md).
