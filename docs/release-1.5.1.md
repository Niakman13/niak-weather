# Niak Weather v1.5.1 — lecture plus claire

Les contributions au ressenti et les mesures techniques (UV, luminosité, rayonnement, humidité, tendance de température, rosée) sont présentées dans des bulles discrètes et centrées, avec retour à la ligne sur mobile. Le séparateur au-dessus des mesures techniques disparaît.

Les cadres Pluie et Vent sont directement visibles, sans menu déroulant. Le cadre Air et pollens de demain reste ouvert ; seuls ses détails des polluants et pollens sont repliables et fermés initialement. Les prévisions de la semaine portent des en-têtes alignés : Min (°C), Max (°C), Pluie (mm).

Les cadres de station reprennent le fond des autres cadres. Le vent moyen, les rafales actuelles et la rafale maximale du jour sont distingués. Les courbes fines comparent la moyenne du vent sur dix minutes et les pics de rafales sur dix minutes ; les valeurs actuelles restent non regroupées. Les données absentes restent des interruptions. [Mécanique des historiques](recent-details.md).

Le titre de synthèse ne reprend plus une description du ciel par défaut. Sans point d’attention prioritaire, il met en avant l’évolution prévue disponible ; sinon, il précise qu’aucun point d’attention marqué ne ressort des sources disponibles. Cela fonctionne sans Atmo, sans transformer une évolution informative en alerte. À droite, la météo actuelle conserve sa priorité aux mesures locales. [Fonctionnement de la synthèse](brief-intelligent.md).

247 tests unitaires et les contrôles navigateur à 375/768/1440 px en clair/sombre vérifient les cadres, les bulles, l’alignement des en-têtes, les volets conservés, les sources et la synthèse sans Atmo. Les interfaces Home Assistant des tests sont simulées.

Dans HACS, sélectionnez **v1.5.1**, puis rechargez le navigateur. Les entités et réglages existants sont conservés ; aucun redémarrage Home Assistant n’est nécessaire.
