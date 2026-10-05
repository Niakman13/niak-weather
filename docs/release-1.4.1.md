# Niak Weather v1.4.1 — comprendre le ressenti

Un petit « i » à côté du titre **Ressenti** déplie une explication courte dans le cadre. Elle rappelle la base humidex Thermal Comfort, le repli sur la température et les corrections estimées de vent, soleil, pluie et nuit. Un lien ouvre directement la section explicative du README sur GitHub.

Le README détaille désormais la formule, les seuils, les limites des corrections et un exemple. Ce ressenti est une estimation propre à la carte, pas un indice météorologique officiel ni une mesure physiologique. **La formule de calcul n’a pas changé.**

L’aide fonctionne au clic et au clavier. Son ouverture ou la sélection du lien ne déclenchent pas la fiche d’un capteur ni la navigation sur appui long de la carte. Le panneau reste adapté aux écrans mobiles.

229 tests unitaires passent, ainsi que les contrôles navigateur et les nouveaux scénarios de l’aide. Les interfaces Home Assistant de ces tests sont simulées.

Dans HACS, sélectionnez **v1.4.1**, puis rechargez le navigateur. Aucune préversion ni modification des entités configurées n’est nécessaire.
