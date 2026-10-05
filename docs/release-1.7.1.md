# Niak Weather v1.7.1 — détails plus compacts

Version stable, sans migration de configuration.

- Un petit **i** à côté de **Synthèse** remplace le volet « Les points à retenir » en bas du bandeau. Il conserve les explications, sources et limites et fonctionne à la souris comme au clavier.
- Les détails Atmo sont centrés et organisés en rangées régulières, sans grand espace avant les informations ouvertes.
- Dans les détails des pollens, le niveau (**1/6**, par exemple) et la concentration partagent une ligne. L’unité déclarée par le capteur est conservée : aucune conversion vers une surface ou vers des grains n’est inventée.
- Les libellés **Maintenant** et **Demain** sont décalés verticalement pour rester lisibles même quand leurs repères sont proches.
- Une fine séparation verticale distingue les rafales de la rose des vents.

## Vérifications et mise à jour

249 tests unitaires, compilation et contrôles navigateur sur mobile, tablette et grand écran, en thèmes clair et sombre. Vérifications du clavier, des sources, des valeurs centrées et des libellés horaires.

Dans HACS → Niak Weather, choisir Mettre à jour ou Retélécharger et sélectionner **v1.7.1**, puis recharger le navigateur (Ctrl+F5). Les préversions ne sont pas nécessaires. Aucun redémarrage de Home Assistant n’est requis.
