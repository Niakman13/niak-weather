# Niak Weather v0.2.0-beta.7

Ajout d’**Atmo France — air extérieur et pollens** dans l’éditeur et la carte, en conservant le rendu météo validé.

- Commune/zone sélectionnable ; préremplissage filtré des 38 entités (19 mesures aujourd’hui et demain), y compris les capteurs renommés.
- Indice global de l’air, cinq sous-indices de polluants, indice global pollen, six espèces et leurs concentrations.
- Affichage du jour et bloc demain dépliable, détails paramétrables, clic/clavier vers chaque entité.
- Indice intérieur (%) distinct de l’extérieur ; les polluants Atmo sont des indices, pas des concentrations.
- Six niveaux de pollens Atmo conservés ; le zéro signifie indisponible. Dates de publication et données anciennes signalées.
- Migration depuis Polleninformation sans double affichage ni suppression de la configuration historique.

L’intégration Atmo France doit être configurée dans Home Assistant, avec les indicateurs et prévisions souhaités. Aucun identifiant API n’est demandé dans la carte.

## Mettre à jour

Dans HACS → Niak Weather → **⋮ → Retélécharger**, choisir **v0.2.0-beta.7**, télécharger puis recharger avec **Ctrl+F5**. Dans l’éditeur, ouvrir le bloc Atmo France, choisir la zone et la source Atmo, puis **Préremplir les entités manquantes**.

Cette version reste une préversion : **la publication stable v1 est en attente**.

Validation : 121 tests, six comparaisons du rendu météo de référence sans différence, six captures du nouveau bloc en clair/sombre sans débordement, filtres/préremplissage/changement de commune et interactions. Les tests navigateur utilisent un environnement Home Assistant simulé ; la nouvelle configuration reste à vérifier sur l’instance après mise à jour.

[Guide Atmo France](https://github.com/Niakman13/niak-weather/blob/main/docs/atmo-france.md) · [Installation](https://github.com/Niakman13/niak-weather/blob/main/docs/installation.md)
