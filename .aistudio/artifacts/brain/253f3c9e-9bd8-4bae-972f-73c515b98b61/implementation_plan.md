# Classement Dynamique et Tri des Bulletins Scolaires (1er au Dernier)

Corriger le calcul des rangs dans les bulletins scolaires pour attribuer le véritable rang de chaque élève en comparant leurs moyennes générales au sein de la classe, et trier automatiquement tous les bulletins du premier au dernier avant l'impression et l'export PDF.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Décisions appliquées pour le classement et l'impression des bulletins :**
> - **Calcul des Rangs Réels** : Remplacement de la condition statique par un calcul comparatif réel de toutes les moyennes générales de la classe pour le trimestre sélectionné.
> - **Gestion des Égalités (Ex-aequo)** : Application de la règle scolaire officielle : en cas d'égalité stricte de moyenne, les élèves partagent le même rang (ex: deux 1ers ex-aequo), et l'élève suivant prend le rang correspondant au nombre d'élèves le précédant (ex: 3ème).
> - **Ordre d'Impression et d'Export** : Les bulletins de toute la classe (`PrintableBulletin` et PDF multi-pages A4) sont désormais strictement ordonnés du **1er au dernier** élève de la classe.
> - **Navigation à l'Écran** : La liste des élèves du module Bulletins intègre un sélecteur de tri par rang ou alphabétique, avec des badges de rang distinctifs (1er Or, 2ème Argent, 3ème Bronze, etc.).

---

### 1. Overview & Core Concept

- **Problème identifié** : Dans la version actuelle, la fonction `generateReportCard` dans `SchoolContext.tsx` utilisait un seuil fixe arbitraire (`if (generalAverage < threshold) rankInClass = 2...`), ce qui attribuait à tous les élèves avec une note décente le rang `1er`. De plus, les bulletins de la classe étaient générés dans l'ordre d'insertion des élèves au lieu d'être ordonnés selon leur performance.
- **Solution apportée** :
  1. Calcul comparatif complet des moyennes de tous les élèves actifs de la même classe pour le trimestre actif.
  2. Calcul dynamique et exact des statistiques de la classe (`classMinAverage`, `classMaxAverage`, `classOverallAverage`, `rankInClass`).
  3. Tri décroissant automatique de l'ensemble des bulletins de la classe par moyenne / rang (1er $\to$ dernier).
  4. Impression physique et génération de fichiers PDF groupés classés du meilleur au dernier élève.

---

### 2. User Experience & Visual Design

- **Module Bulletins (Écran principal)** :
  - La liste latérale des élèves affiche pour chaque apprenant son rang calculé en temps réel avec un style visuel soigné :
    - **1er** : Badge doré subtil avec mention `1er` et moyenne sur 20 (ou sur 10 en cycle 1).
    - **2ème** : Badge argenté avec mention `2ème`.
    - **3ème** : Badge bronze avec mention `3ème`.
    - **Suivants** : Indicateur de rang clair et discret (`4ème`, `5ème`, ...).
  - Un sélecteur de tri permet au directeur/enseignant de basculer en 1 clic entre :
    - *Tri par Rang (Du 1er au dernier)* — **Par défaut**.
    - *Tri Alphabétique (A-Z)*.
- **Impression Groupée de la Classe (`Imprimer Tous les Bulletins`)** :
  - Les bulletins imprimés sur papier A4 paysage (2 bulletins par feuille) apparaissent directement dans l'ordre hiérarchique : page 1 contient le 1er et le 2ème, page 2 contient le 3ème et le 4ème, jusqu'au dernier.
- **Téléchargement PDF Groupé (`PDF A4 de la Classe`)** :
  - Le document PDF unique téléchargé contient les bulletins classés séquentiellement du 1er au dernier élève.

---

### 3. Key Product Decisions & Trade-Offs

- **Décision 1 : Calcul de classe optimisé et mis en cache localement**
  - *Approche* : Calculer en un seul passage les moyennes de tous les élèves de la classe pour le trimestre donné, puis dériver les rangs et les extrêmes (min, max, moyenne de classe).
  - *Raison* : Évite de recalculer $N^2$ fois les moyennes de la classe et garantit une réactivité instantanée même avec des classes de 60 élèves.
- **Décision 2 : Gestion des élèves sans note saisie**
  - *Approche* : Les élèves sans aucune évaluation dans le trimestre sont classés en fin de tableau avec la mention `Non classé` ou rang terminal, sans fausser la moyenne des élèves évalués.
  - *Raison* : Reflète fidèlement les pratiques administratives scolaires maliennes.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    SchoolContext.tsx                        │
│  - calculateClassGradesAndRanks(classId, term)              │
│    • Calcule la moyenne de chaque élève de la classe        │
│    • Trie par moyenne décroissante                          │
│    • Attribue les rangs officiels (1er, 2ème, ex-aequo...)  │
│    • Calcule Min, Max, Moyenne de la classe                 │
│  - generateReportCard(studentId, term)                      │
│    • Injecte le rang réel & stats collectives réelles       │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     BulletinsModule.tsx       │   │         pdfService.ts         │
│ - allClassReportCards triés   │   │ - generateClassReportCardsPdf │
│   du 1er au dernier           │   │   • Reçoit la liste triée     │
│ - Impression directe ordonnée │   │   • Génère les pages A4       │
│ - Filtres & affichage du rang │   │     dans l'ordre 1er -> Dernier
└───────────────────────────────┘   └───────────────────────────────┘
```

#### Fichiers cibles pour la mise en œuvre :
1. `src/contexts/SchoolContext.tsx` : Refonte de l'algorithme de calcul des rangs et des moyennes de classe dans `generateReportCard`.
2. `src/modules/bulletins/BulletinsModule.tsx` : Tri par défaut des bulletins (`allClassReportCards` et `classStudents`) par rang décroissant, et options de tri à l'écran.
3. `src/services/pdfService.ts` : Vérification du maintien du tri lors du rendu des pages PDF A4 groupées.
