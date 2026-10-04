# Niak Weather v1.2.0-beta.2 — une météo plus lisible

Cette bêta réorganise la carte en trois parties dans un seul cadre, sans modifier les seuils du brief intelligent. **La v1.0.0 reste la stable.**

## Nouveau design

- **Synthèse** : trois signaux importants maximum, avec le point prioritaire puis les observations et prévisions. Les autres points restent comptés et accessibles dans « Comprendre la synthèse ». La couleur tient compte de tous les signaux, pas seulement de ceux affichés.
- **Aujourd’hui** : jauge de ressenti en premier, quatre cadres température/ressenti, vent, pluie et pression, puis détails pluie/vent visibles et repliables, mesures techniques, air et pollens du jour.
- **Prévisions** : graphiques horaires et quotidiens conservés, suivis des indices d’air et de pollens de demain.

Le cercle météo à gauche retrouve son halo animé et sa respiration lumineuse. La couleur suit le niveau d’attention ; les animations s’arrêtent lorsque l’appareil demande une réduction des mouvements.

Atmo utilise des disques à six secteurs avec un visage central, le nom au-dessus et le niveau en dessous. Un dégradé continu **vert → jaune → orange → rouge** remplace les couleurs tranchées. Cette palette est un choix visuel Niak Weather, pas le nuancier officiel Atmo ; valeurs et libellés restent inchangés. Les données manquantes, anciennes ou le code évènement 7 ne remplissent pas le disque. Un sous-indice plus préoccupant que l’indice global reste visible et nommé correctement ; tous les détails restent consultables.

Le mode compact conserve Synthèse et Aujourd’hui. Les données anciennes d’un modèle personnalisé indisponible ne sont plus affichées comme des mesures actuelles.

## Installer ou mettre à jour dans HACS

1. Sauvegarde le YAML de ta carte avant le test.
2. Ouvre **HACS → Niak Weather → ⋮ → Retélécharger / Redownload**, ou le dialogue de téléchargement.
3. Sélectionne **v1.2.0-beta.2** dans le choix de version. Active l’affichage des préversions si ton interface le propose et que la bêta est masquée.
4. Télécharge puis recharge le tableau de bord avec **Ctrl+F5** ou **Cmd+Shift+R**. Dans l’application mobile, recharge le frontend ou réinitialise son cache si l’ancien rendu persiste.

**Aucun redémarrage de Home Assistant n’est nécessaire.** Les entités existantes sont conservées. Le brief reste activé par défaut ; `smart_brief: false` désactive l’interprétation intelligente, sans annuler la nouvelle organisation visuelle. La vigilance départementale Météo-France reste facultative et doit être choisie explicitement dans les réglages.

Pour revenir à la stable, sélectionne **v1.0.0** dans le même dialogue, télécharge et recharge le navigateur. Restaure le YAML sauvegardé si nécessaire.

## Vérifications et limites

**156 tests automatisés** passent. Les contrôles navigateur couvrent trois largeurs (375, 768 et 1440 px), les thèmes clair/sombre, les sources au clavier, les données absentes, le mode compact et le fonctionnement réel des animations avec et sans réduction des mouvements.

Le nouveau design n’a pas encore de référence visuelle approuvée ; le rendu sur une vraie installation et les contrastes de tous les thèmes restent à éprouver. Ce contrôle n’est pas une certification complète d’accessibilité ou de performances. La carte distingue observations, prévisions et indices de zone ; elle ne remplace pas les consignes officielles ou un avis médical.

[Mécanique du brief, seuils et limites](https://github.com/Niakman13/niak-weather/blob/v1.2.0-beta.2/docs/brief-intelligent.md).
