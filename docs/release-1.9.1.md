# Niak Weather v1.9.1 — pluie fiable et colonnes plus parlantes

Version corrective. Aucun réglage à modifier : la configuration existante est conservée.

- **Graphique « Pluie des 7 derniers jours » corrigé.** Une station qui décroche quelques secondes (`indisponible`) effaçait la journée entière : sur une semaine réelle d'une GW2000A, un seul jour sur sept restait affiché. Les journées sont désormais conservées ; seule une coupure encore en cours à minuit peut masquer une pluie, et la journée est alors marquée « historique partiel ».
- **Cumuls semaine, mois et année calculés depuis un compteur total** : les statistiques long terme de Home Assistant sont lues dans la bonne unité, et la période en cours n'est plus prise pour une période terminée.
- **Une bulle d'état sous le titre des colonnes Pluie, Vent et Pression**, seulement quand il se passe quelque chose : *Pluie en cours* ou *Forte pluie en cours*, *Le vent s'intensifie* ou *Le vent faiblit* (au moins 8 km/h en une heure), *La pression baisse* ou *La pression monte*. Elle reprend en un mot, dans la bonne colonne, ce que la synthèse annonce.
- **Écart de ressenti reformulé** : « Le ressenti est plus élevé que le thermomètre (+6 °C) » au lieu de « Il fait nettement plus chaud que ce qu'indique le thermomètre ».

## Vérifications et limites

285 tests unitaires et contrôles navigateur réussis. Le graphique de pluie est testé sur l'historique réel d'une GW2000A (29/09 → 07/10/2026), recoupé avec le compteur mensuel de la station.

## Mise à jour

Dans **HACS → Niak Weather**, choisir **Mettre à jour** ou **Retélécharger**, puis sélectionner **v1.9.1**. Rechargez ensuite le navigateur avec **Ctrl+F5** ; aucun redémarrage de Home Assistant ni activation des préversions n'est nécessaire.
