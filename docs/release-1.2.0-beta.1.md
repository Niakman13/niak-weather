# Niak Weather v1.2.0-beta.1 — le bandeau devient un brief

Cette première bêta de la v1.2 traduit les données météo en phrases compréhensibles : **le ressenti maintenant, ce qui arrive et les points qui méritent de l’attention**. La v1.0.0 reste la version stable ; cette préversion se teste volontairement.

## Ce qui change

Le bandeau rapproche le ressenti et ses contributions des mesures de vent, rafales, pluie et UV. Il exploite les six prochaines heures disponibles pour signaler la pluie annoncée, son cumul, un orage prévu ou un changement de température. La pression apporte du contexte, sans devenir une promesse de pluie.

Les indices Atmo disponibles complètent le résumé avec l’air extérieur et les pollens, en distinguant aujourd’hui de demain. Le signal le plus préoccupant est conservé, pas noyé dans une moyenne. Un indice personnalisé d’air intérieur en pourcentage reste séparé, sans seuil sanitaire inventé.

La couleur exprime le niveau d’attention le plus élevé : bleu pour la synthèse, jaune pour « à surveiller », orange pour « attention renforcée ». **Le rouge est réservé à une vigilance rouge officielle Météo-France.** Le gris indique des données insuffisantes. Le texte accompagne toujours la couleur ; une synthèse partielle n’est pas une garantie de sécurité.

Le volet **Comprendre le brief et ses limites** expose les raisons, les données manquantes ou anciennes et les entités sources. Les règles sont explicables : aucune API d’IA, clé ou abonnement supplémentaire n’est nécessaire.

## Installer avec HACS

1. Sauvegarde le YAML de ta carte avant le test, notamment pour faciliter un retour à la stable.
2. Ouvre **HACS → Niak Weather**, puis le menu **⋮ → Retélécharger / Redownload** (ou le dialogue de téléchargement).
3. Dans le choix de version, sélectionne **v1.2.0-beta.1**. Si elle est masquée, active l’affichage des versions bêta/préversions lorsque ton interface HACS le propose.
4. Télécharge cette version, puis recharge le tableau de bord en forçant le rechargement du navigateur (`Ctrl+F5` ou `Cmd+Shift+R`). Dans l’application mobile, recharge le frontend ou réinitialise son cache si l’ancien bandeau reste affiché.

Il s’agit d’une carte de tableau de bord, pas d’une intégration : **aucun redémarrage de Home Assistant n’est nécessaire**. Les entités déjà configurées sont conservées. Les libellés du dialogue de version peuvent varier selon HACS.

## Réglages et premier essai

Le brief est activé par défaut. Le bloc **Brief intelligent et vigilance** permet de le désactiver et de choisir, facultativement, une entité de vigilance départementale Météo-France déjà présente dans Home Assistant. La liste est filtrée ; **vérifie toi-même le département**, il n’est pas choisi automatiquement.

Sans vigilance configurée, la synthèse des autres sources fonctionne. Chaque source facultative enrichit le brief ; une valeur absente n’est pas assimilée à zéro. Les seuils d’interprétation sont actuellement définis dans le moteur, pas réglables individuellement dans l’éditeur.

Pour retrouver le bandeau simple dans la bêta, désactive le brief dans l’éditeur ou utilise :

```yaml
smart_brief: false
```

Pour revenir complètement à la stable, sélectionne **v1.0.0** dans le même dialogue HACS, télécharge-la puis recharge le navigateur. Si nécessaire, restaure le YAML sauvegardé avant le test.

## Vérifications et limites

La bêta dispose de **150 tests automatisés**, dont des scénarios dédiés au brief. Les contrôles navigateur couvrent 18 cas à 375, 768 et 1440 px, en clair et sombre, avec vérification des débordements, des explications et de l’accès aux sources au clavier.

Le nouveau bandeau reste à éprouver sur des installations réelles et pendant des épisodes météo. Ces contrôles ne constituent pas une validation complète des contrastes de tous les thèmes, de l’accessibilité ou des performances. Les observations de la station, les prévisions du fournisseur et les indices de zone restent distingués. Une quantité de pluie inconnue ne signifie pas « pas de pluie ».

La carte ne remplace ni les consignes de vigilance officielles, ni un avis médical. Elle ne crée pas de notifications ou d’automatisations. Pour comprendre les seuils, la fraîcheur des données et les priorités : [guide du brief intelligent](https://github.com/Niakman13/niak-weather/blob/v1.2.0-beta.1/docs/brief-intelligent.md).
