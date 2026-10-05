# Niak Weather v1.7.2 — synthèse utile et édition plus fluide

Version stable, sans migration de configuration.

- Le petit **i** de la Synthèse ouvre un panneau superposé sur toute la largeur du bandeau, sans déplacer les sections suivantes. Les cadres imbriqués et le commentaire sur la couleur sont retirés. Sur mobile, le panneau défile indépendamment ; il se ferme avec Fermer, le « i », Échap ou un clic à l’extérieur.
- **À venir** apparaît uniquement pour une évolution pertinente. Une variation de pression significative peut accompagner les informations sur l’air et les pollens, sans modifier le niveau d’alerte ni devenir une prévision de pluie.
- Le calcul des tendances conserve l’état enregistré à la limite de la fenêtre d’historique, au lieu de perdre sa référence quelques secondes après son chargement. Les historiques des capteurs inchangés sont conservés pendant les modifications des autres sources.
- L’éditeur explique brièvement le rôle de chaque catégorie. **Capteurs locaux / station météo locale**, Thermal Comfort et Atmo France sont présentés comme conseillés. Les choix redondants d’appareil Thermal Comfort et de source des pollens disparaissent de l’interface ; les anciennes configurations restent compatibles.
- La saisie de texte ne reconstruit plus les listes d’entités. Les catégories fermées ne construisent pas leurs sélecteurs et les changements de capteurs ne rechargent plus inutilement les prévisions.

## Vérifications et mise à jour

252 tests unitaires, compilation et contrôles navigateur sur mobile, tablette et grand écran, en thèmes clair et sombre. Tests de fermeture du panneau, absence de déplacement de la carte, tendances de pression et saisie dans un éditeur contenant 3 000 capteurs supplémentaires.

Dans **HACS → Niak Weather**, choisir **Mettre à jour** ou **Retélécharger**, sélectionner **v1.7.2**, puis recharger le navigateur (Ctrl+F5). Les préversions ne sont pas nécessaires et aucun redémarrage de Home Assistant n’est requis.
