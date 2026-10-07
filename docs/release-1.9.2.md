# Niak Weather v1.9.2 — un ciel plus vivant

Aucun réglage à modifier : la configuration existante est conservée.

- **Animations plus visibles.** Seule la couleur du ciel est estompée ; nuages, pluie, éclairs et lune restent nets, et le voile ne protège plus que la colonne de texte. Les mouvements sont environ 25 % plus rapides, et la pluie compte plus de gouttes, plus longues et plus lumineuses.
- **Une vraie scène de brouillard** : des nappes de brume qui dérivent et respirent, avec un soleil voilé en journée. Elle reste visible en thème clair comme en thème sombre.
- **Nuit claire** : une lune plus lumineuse avec un halo, et des étoiles qui scintillent chacune à son rythme.
- **Orage plus marqué** : ciel plus sombre, trois éclairs qui frappent à tour de rôle, chacun avec son flash qui illumine les nuages. Jamais plus de deux flashs par seconde, sous le seuil de risque pour l'épilepsie photosensible ; aucun flash lorsque l'appareil demande de réduire les animations ou quand les animations sont désactivées dans la carte.
- **Texte « En ce moment » lisible sur tous les ciels** : il suit la couleur du thème sur un ciel clair et reste blanc la nuit, sous l'orage et sous l'averse.
- **Ordre des lignes de la synthèse** : Vigilance, puis Maintenant, puis À venir. Les informations retenues restent les plus importantes ; seul leur ordre d'affichage change.

## Vérifications et limites

286 tests unitaires et contrôles navigateur réussis. Chaque scène a été comparée à la v1.9.1 en thème clair et sombre, à l'instant du flash pour l'orage.

## Mise à jour

Dans **HACS → Niak Weather**, choisir **Mettre à jour** ou **Retélécharger**, puis sélectionner **v1.9.2**. Rechargez ensuite le navigateur avec **Ctrl+F5** ; aucun redémarrage de Home Assistant ni activation des préversions n'est nécessaire.
