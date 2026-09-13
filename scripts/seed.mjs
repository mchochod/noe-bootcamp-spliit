// Demo data for the bootcamp: four groups telling one coherent story around
// Alice, who appears in all of them. Idempotent — it deletes the four demo
// groups by their fixed ids and recreates them, so a group a participant
// created themselves is left alone.
//
// Talks to postgres through `pg` rather than Prisma, for the same reason
// perf/seed.ts does: the generated Prisma 7 client is ESM-only and awkward to
// load from a standalone script, and plain SQL is enough here.
//
// Two conventions worth knowing before editing the data below:
//   - amounts are in minor units (cents), like the Expense.amount column;
//   - shares must satisfy the invariants enforced in src/lib/schemas.ts —
//     BY_PERCENTAGE sums to 10000 (basis points), BY_AMOUNT sums to the
//     expense amount, BY_SHARES is any set of integers.
import { pathToFileURL } from 'node:url'
import { Client } from 'pg'

const DEMO_GROUP_IDS = ['demo-coloc', 'demo-couple', 'demo-yc', 'demo-etretat']

// Re-exported so the browser can register the groups it just asked for.
export const demoGroupSummaries = () =>
  GROUPS.map(({ id, name }) => ({ id, name }))

const cents = (value) => Math.round(value * 100)
const iso = (date) => date.toISOString().slice(0, 10)

// The last few weeks are dated relative to today on purpose. With fixed dates
// the seed would rot: run in December, it would have no "Today" section and
// the "This month" / "Last 30 days" stats would come back empty. History stays
// absolute; only the recent tail moves.
const TODAY = new Date()
const daysAgo = (n) => {
  const date = new Date(TODAY)
  date.setDate(date.getDate() - n)
  return iso(date)
}

// Category ids, from prisma/migrations/20240108194443_add_categories.
const CAT = {
  general: 0,
  payment: 1,
  entertainment: 2,
  movies: 4,
  sports: 6,
  diningOut: 8,
  groceries: 9,
  liquor: 10,
  electronics: 12,
  furniture: 13,
  supplies: 14,
  rent: 18,
  services: 19,
  clothing: 21,
  gifts: 23,
  insurance: 24,
  medical: 25,
  transportation: 27,
  train: 29,
  fuel: 31,
  hotel: 32,
  plane: 34,
  taxi: 35,
  cleaning: 37,
  electricity: 38,
  internet: 41,
}

/**
 * One expense. `forWhom` is a list of participant keys, or 'all'.
 * opts: { split, shares, notes, recurring, reimbursement, original }
 */
const E = (date, title, amount, by, forWhom, category, opts = {}) => ({
  date,
  title,
  amount: cents(amount),
  by,
  forWhom,
  category,
  ...opts,
})

// ---------------------------------------------------------------------------
// 1. Coloc Oberkampf — closed in March 2026, when Alice and Bob moved out.
// ---------------------------------------------------------------------------

const colocRent = [
  ['2025-07-03', 'alice'],
  ['2025-08-03', 'bob'],
  ['2025-09-02', 'karim'],
  ['2025-10-03', 'lea'],
  ['2025-11-03', 'alice'],
  ['2025-12-02', 'bob'],
  ['2026-01-05', 'karim'],
  ['2026-02-03', 'lea'],
  ['2026-03-03', 'alice'],
].map(([date, by]) =>
  // Alice and Bob have the two big bedrooms, hence the uneven shares.
  E(date, 'Loyer + charges', 2100, by, 'all', CAT.rent, {
    split: 'BY_SHARES',
    shares: { alice: 6, bob: 6, karim: 5, lea: 5 },
    recurring: 'MONTHLY',
  }),
)

const colocInternet = [
  '2025-07-08',
  '2025-08-08',
  '2025-09-08',
  '2025-10-08',
  '2025-11-08',
  '2025-12-08',
  '2026-01-08',
  '2026-02-08',
  '2026-03-08',
].map((date) =>
  E(date, 'Internet Free', 39.99, 'karim', 'all', CAT.internet, {
    recurring: 'MONTHLY',
  }),
)

const coloc = {
  id: 'demo-coloc',
  name: 'Coloc Oberkampf',
  currency: '€',
  currencyCode: 'EUR',
  information:
    "Trois ans rue Oberkampf. Groupe soldé en mars 2026 : Alice et Bob ont pris un appartement, Karim et Léa ont repris le bail.",
  createdAt: '2025-07-01',
  participants: {
    alice: 'Alice',
    bob: 'Bob',
    karim: 'Karim',
    lea: 'Léa',
  },
  expenses: [
    ...colocRent,
    ...colocInternet,
    E('2025-07-06', 'Courses Franprix', 78.4, 'lea', 'all', CAT.groceries),
    E('2025-07-19', 'Pizza du vendredi', 46.0, 'bob', 'all', CAT.diningOut, {
      notes: 'Tradition du vendredi soir, on alterne qui commande.',
    }),
    E('2025-07-28', 'Électricité EDF', 168.4, 'alice', 'all', CAT.electricity),
    E('2025-08-09', 'Courses Grand Frais', 92.15, 'karim', 'all', CAT.groceries),
    E('2025-08-23', 'Ventilateur salon', 64.9, 'bob', 'all', CAT.furniture, {
      notes: 'Canicule. Racheté après que le premier a rendu l’âme.',
    }),
    E('2025-09-06', 'Courses Franprix', 71.2, 'alice', 'all', CAT.groceries),
    E('2025-09-14', 'Produits ménagers', 34.75, 'lea', 'all', CAT.supplies),
    E('2025-09-27', 'Électricité EDF', 195.2, 'bob', 'all', CAT.electricity),
    E('2025-10-11', 'Courses Grand Frais', 88.6, 'bob', 'all', CAT.groceries),
    E('2025-10-25', 'Soirée Halloween', 112.3, 'lea', 'all', CAT.liquor, {
      notes: 'Courses boissons pour la soirée, remboursé en partie par les invités.',
    }),
    E('2025-11-15', 'Courses Franprix', 95.0, 'karim', 'all', CAT.groceries),
    E('2025-11-22', 'Plombier fuite salle de bain', 180.0, 'alice', 'all', CAT.services, {
      notes: 'À refacturer au propriétaire, devis envoyé le 24.',
    }),
    E('2025-11-29', 'Électricité EDF', 142.1, 'karim', 'all', CAT.electricity),
    E('2025-12-06', 'Sapin + décorations', 58.9, 'lea', 'all', CAT.general),
    E('2025-12-13', 'Repas de Noël coloc', 156.8, 'bob', 'all', CAT.diningOut),
    E('2026-01-10', 'Courses Franprix', 83.45, 'alice', 'all', CAT.groceries),
    E('2026-01-24', 'Cadeau anniversaire Karim', 60.0, 'alice', ['alice', 'bob', 'lea'], CAT.gifts, {
      notes: 'Ne pas en parler à Karim avant le 28.',
    }),
    E('2026-01-31', 'Électricité EDF', 121.75, 'lea', 'all', CAT.electricity),
    E('2026-02-14', 'Courses Grand Frais', 76.3, 'karim', 'all', CAT.groceries),
    E('2026-02-28', 'Ménage de fin de bail', 240.0, 'bob', 'all', CAT.cleaning, {
      notes: 'Société de nettoyage, exigé par l’agence pour l’état des lieux.',
    }),
    E('2026-03-14', 'Fête de départ', 128.6, 'alice', 'all', CAT.liquor),
    // Settling up. These are exactly the transfers the balances screen
    // suggests for everything above, so the closed group ends at zero — which
    // is the point of contrast with the three groups that are still open.
    E('2026-03-21', 'Solde de tout compte — Bob → Alice', 831.73, 'bob', ['alice'], CAT.payment, {
      reimbursement: true,
    }),
    E('2026-03-21', 'Solde de tout compte — Léa → Alice', 336.66, 'lea', ['alice'], CAT.payment, {
      reimbursement: true,
    }),
    E('2026-03-22', 'Solde de tout compte — Léa → Karim', 21.35, 'lea', ['karim'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

// ---------------------------------------------------------------------------
// 2. Alice & Bob — started March 2025 while still flatmates; the shared rent
//    only appears in April 2026, once they had their own place.
// ---------------------------------------------------------------------------

const coupleRent = [
  '2026-04-02',
  '2026-05-04',
  '2026-06-02',
  '2026-07-02',
  '2026-08-03',
  '2026-09-02',
].map((date) =>
  // Alice earns more, so they agreed on 60/40 rather than half each.
  E(date, 'Loyer Rue de Charonne', 1450, 'alice', 'all', CAT.rent, {
    split: 'BY_PERCENTAGE',
    shares: { alice: 6000, bob: 4000 },
    recurring: 'MONTHLY',
  }),
)

const couple = {
  id: 'demo-couple',
  name: 'Alice & Bob',
  currency: '€',
  currencyCode: 'EUR',
  information:
    'Nos dépenses communes. Loyer et charges au prorata des revenus (60/40), le reste moitié-moitié.',
  createdAt: '2025-03-01',
  participants: { alice: 'Alice', bob: 'Bob' },
  expenses: [
    // 2025 — still flatmates, this group is only for the two of them.
    E('2025-03-15', 'Premier resto', 68.5, 'bob', 'all', CAT.diningOut, {
      notes: 'Le Petit Cambodge. À refaire.',
    }),
    E('2025-04-05', 'Cinéma', 24.6, 'alice', 'all', CAT.movies),
    E('2025-04-26', 'Week-end Deauville', 214.0, 'alice', 'all', CAT.hotel),
    E('2025-05-17', 'Concert Olympia', 96.0, 'bob', 'all', CAT.entertainment),
    E('2025-06-08', 'Brunch', 43.2, 'alice', 'all', CAT.diningOut),
    E('2025-06-21', 'Fête de la musique', 37.8, 'bob', 'all', CAT.liquor),
    E('2025-07-12', 'Train Bordeaux', 138.0, 'alice', 'all', CAT.train),
    E('2025-08-02', 'Airbnb Biarritz', 620.0, 'bob', 'all', CAT.hotel, {
      notes: 'Cinq nuits, annulation gratuite jusqu’au 25 juillet.',
    }),
    E('2025-08-06', 'Location planches de surf', 90.0, 'alice', 'all', CAT.sports),
    E('2025-09-13', 'Resto anniversaire Bob', 124.0, 'alice', ['bob', 'alice'], CAT.diningOut),
    E('2025-10-04', 'Cinéma', 26.0, 'bob', 'all', CAT.movies),
    E('2025-10-19', 'Pizza et série', 32.4, 'alice', 'all', CAT.diningOut),
    E('2025-11-08', 'Théâtre', 78.0, 'bob', 'all', CAT.entertainment),
    E('2025-12-20', 'Cadeaux de Noël familles', 240.0, 'alice', 'all', CAT.gifts, {
      notes: 'Moitié pour ses parents, moitié pour les miens.',
    }),
    E('2026-01-11', 'Resto nouvel an chinois', 88.9, 'bob', 'all', CAT.diningOut),
    E('2026-02-14', 'Saint-Valentin', 156.0, 'bob', 'all', CAT.diningOut),
    E('2026-03-07', 'Visite appartements', 18.6, 'alice', 'all', CAT.transportation, {
      notes: 'Métro et café entre deux visites.',
    }),
    // April 2026 — they move in together.
    ...coupleRent,
    E('2026-04-04', 'Caution appartement', 2900.0, 'alice', 'all', CAT.rent, {
      split: 'BY_PERCENTAGE',
      shares: { alice: 6000, bob: 4000 },
      notes: 'Récupérable en fin de bail. Deux mois de loyer.',
    }),
    E('2026-04-06', 'Camion déménagement', 189.0, 'bob', 'all', CAT.transportation),
    E('2026-04-11', 'Canapé', 849.0, 'alice', 'all', CAT.furniture),
    E('2026-04-12', 'IKEA — le reste', 412.35, 'bob', 'all', CAT.furniture, {
      notes: 'Étagères, lampes, vaisselle. Ticket dans le tiroir si besoin de rapporter.',
    }),
    E('2026-04-19', 'Courses Monoprix', 112.4, 'alice', 'all', CAT.groceries),
    E('2026-04-15', 'Assurance habitation MAIF', 264.0, 'bob', 'all', CAT.insurance, {
      split: 'BY_PERCENTAGE',
      shares: { alice: 6000, bob: 4000 },
      notes: 'Prime annuelle, prélevée sur le compte de Bob.',
    }),
    E('2026-04-28', 'Internet Orange', 44.99, 'bob', 'all', CAT.internet, {
      recurring: 'MONTHLY',
    }),
    E('2026-05-03', 'Courses Monoprix', 96.75, 'bob', 'all', CAT.groceries),
    E('2026-05-16', 'Électricité', 87.2, 'alice', 'all', CAT.electricity),
    E('2026-05-24', 'Resto avec Marc et Camille', 142.0, 'bob', 'all', CAT.diningOut),
    E('2026-06-07', 'Courses Monoprix', 104.3, 'bob', 'all', CAT.groceries, {
      notes: 'Alice à San Francisco, courses pour un seul.',
    }),
    E('2026-06-28', 'Électricité', 79.4, 'bob', 'all', CAT.electricity),
    E('2026-07-11', 'Courses Monoprix', 118.9, 'alice', 'all', CAT.groceries),
    E('2026-07-25', 'Vacances Sicile — vols', 486.0, 'alice', 'all', CAT.plane),
    E('2026-08-01', 'Vacances Sicile — hôtel', 740.0, 'bob', 'all', CAT.hotel),
    E('2026-08-09', 'Location voiture Sicile', 231.5, 'alice', 'all', CAT.transportation),
    E('2026-08-22', 'Courses Monoprix', 87.65, 'bob', 'all', CAT.groceries),
    // The recent tail, relative to today.
    E(daysAgo(26), 'Électricité', 91.3, 'alice', 'all', CAT.electricity),
    E(daysAgo(19), 'Resto rentrée', 74.5, 'bob', 'all', CAT.diningOut),
    E(daysAgo(14), 'Courses Monoprix', 102.15, 'alice', 'all', CAT.groceries),
    E(daysAgo(9), 'Pharmacie', 38.2, 'bob', 'all', CAT.medical, {
      notes: 'Remboursé par la mutuelle, à vérifier fin du mois.',
    }),
    E(daysAgo(5), 'Cinéma', 27.0, 'alice', 'all', CAT.movies),
    E(daysAgo(2), 'Marché', 46.8, 'bob', 'all', CAT.groceries),
    E(daysAgo(0), 'Courses Monoprix', 64.25, 'alice', 'all', CAT.groceries),
  ],
}

// ---------------------------------------------------------------------------
// 3. YC Combinator Summer26 — one month in San Francisco, in dollars.
// ---------------------------------------------------------------------------

const yc = {
  id: 'demo-yc',
  name: 'YC Combinator Summer26',
  currency: '$',
  currencyCode: 'USD',
  information:
    'Un mois à San Francisco pour la summer batch. Colocation à la Hexa House. Tout est en dollars, on solde au retour.',
  createdAt: '2026-05-20',
  participants: { alice: 'Alice', marc: 'Marc', camille: 'Camille' },
  expenses: [
    // Booked in euros from Paris; stored in dollars with the rate of the day.
    // Camille changed her return date, so each founder carries their own fare.
    E('2026-05-22', 'Vols Paris → SFO', 2814.0, 'alice', 'all', CAT.plane, {
      split: 'BY_AMOUNT',
      shares: { alice: 81200, marc: 81200, camille: 119000 },
      original: { amount: 260000, currency: 'EUR', rate: '1.0823' },
      notes: 'Payé en euros sur la carte d’Alice. Camille rentre une semaine plus tard.',
    }),
    E('2026-06-01', 'Hexa House — juin', 4500.0, 'marc', 'all', CAT.rent, {
      notes: 'Trois chambres, un mois. Virement fait le 28 mai.',
    }),
    E('2026-06-01', 'Deposit Hexa House', 1500.0, 'camille', 'all', CAT.rent, {
      notes: 'Rendu au checkout si rien de cassé.',
    }),
    E('2026-06-02', 'Uber SFO → Mission', 68.4, 'camille', 'all', CAT.taxi),
    E('2026-06-02', 'Cartes SIM Mint Mobile', 90.0, 'alice', 'all', CAT.internet),
    E('2026-06-03', 'Trader Joe’s', 187.6, 'marc', 'all', CAT.groceries),
    E('2026-06-04', 'Domaine + Stripe fees', 100.0, 'alice', 'all', CAT.services, {
      notes: 'Cent dollars à trois, le centime orphelin est pour quelqu’un.',
    }),
    E('2026-06-06', 'Coworking day passes', 135.0, 'camille', 'all', CAT.services),
    E('2026-06-08', 'Dîner avec le batch', 246.8, 'alice', 'all', CAT.diningOut),
    E('2026-06-10', 'Trader Joe’s', 164.25, 'camille', 'all', CAT.groceries),
    E('2026-06-11', 'Laverie', 42.0, 'marc', 'all', CAT.cleaning),
    E('2026-06-13', 'Caltrain — Mountain View', 57.0, 'marc', 'all', CAT.train, {
      notes: 'Office hours chez YC.',
    }),
    E('2026-06-15', 'AWS credits overflow', 312.0, 'alice', 'all', CAT.services, {
      notes: 'À refacturer à la boîte, garder la facture.',
    }),
    E('2026-06-17', 'Trader Joe’s', 152.9, 'alice', 'all', CAT.groceries),
    E('2026-06-18', 'Pizza avant la répétition Demo Day', 78.5, 'camille', 'all', CAT.diningOut),
    E('2026-06-20', 'Randonnée Marin Headlands', 96.0, 'marc', 'all', CAT.transportation, {
      notes: 'Location de voiture pour la journée, essence comprise.',
    }),
    E('2026-06-22', 'Écran externe', 229.0, 'camille', ['camille', 'marc'], CAT.electronics, {
      notes: 'Alice a le sien, elle ne participe pas.',
    }),
    E('2026-06-24', 'Trader Joe’s', 176.4, 'marc', 'all', CAT.groceries),
    E('2026-06-26', 'Chemises Demo Day', 174.0, 'alice', 'all', CAT.clothing),
    E('2026-06-28', 'Uber — investisseurs Sand Hill', 112.75, 'alice', 'all', CAT.taxi),
    E('2026-07-01', 'Hexa House — juillet (prorata)', 1500.0, 'marc', 'all', CAT.rent),
    E('2026-07-02', 'Dîner Demo Day', 318.0, 'camille', 'all', CAT.diningOut, {
      notes: 'On a fêté ça. Aucun regret.',
    }),
    E('2026-07-04', 'Ménage de sortie', 180.0, 'alice', 'all', CAT.cleaning),
    E('2026-07-05', 'Uber Mission → SFO', 74.2, 'marc', ['marc', 'alice'], CAT.taxi),
    E('2026-07-14', 'Remboursement Marc → Alice', 640.0, 'marc', ['alice'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

// ---------------------------------------------------------------------------
// 4. Week-end à Étretat — short, dense, five people, uneven participation.
// ---------------------------------------------------------------------------

const etretat = {
  id: 'demo-etretat',
  name: 'Week-end à Étretat',
  currency: '€',
  currencyCode: 'EUR',
  information: 'Trois jours en Normandie, du 8 au 10 mai. Léa nous a rejoints en train.',
  createdAt: '2026-04-28',
  participants: {
    alice: 'Alice',
    bob: 'Bob',
    marc: 'Marc',
    camille: 'Camille',
    lea: 'Léa',
  },
  expenses: [
    E('2026-05-08', 'Gîte 2 nuits', 480.0, 'bob', 'all', CAT.hotel, {
      notes: 'Arrhes versées en mars, solde payé sur place.',
    }),
    E('2026-05-08', 'Essence aller', 92.4, 'marc', ['marc', 'alice', 'bob', 'camille'], CAT.fuel, {
      notes: 'Léa est venue en train, elle ne participe pas à la voiture.',
    }),
    E('2026-05-08', 'Train Paris → Le Havre', 42.0, 'lea', ['lea'], CAT.train),
    E('2026-05-08', 'Courses du week-end', 95.0, 'alice', 'all', CAT.groceries),
    E('2026-05-08', 'Cidre et calvados', 38.7, 'camille', 'all', CAT.liquor),
    E('2026-05-09', 'Restaurant Le Bel Ami', 187.5, 'alice', 'all', CAT.diningOut, {
      split: 'BY_SHARES',
      // Marc and Camille took the seafood platter.
      shares: { alice: 1, bob: 1, marc: 2, camille: 2, lea: 1 },
      notes: 'Plateau de fruits de mer pour deux, le reste au menu du jour.',
    }),
    E('2026-05-09', 'Musée Sherlock Holmes', 36.0, 'bob', ['bob', 'marc', 'lea'], CAT.entertainment),
    E('2026-05-09', 'Crêpes', 43.2, 'camille', 'all', CAT.diningOut),
    E('2026-05-10', 'Petit-déjeuner', 51.5, 'lea', 'all', CAT.diningOut),
    E('2026-05-10', 'Essence retour', 88.9, 'marc', ['marc', 'alice', 'bob', 'camille'], CAT.fuel),
    E('2026-05-10', 'Péages', 62.4, 'bob', ['marc', 'alice', 'bob', 'camille'], CAT.transportation),
    E('2026-05-18', 'Remboursement Camille → Bob', 74.0, 'camille', ['bob'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

// Alice holds the lease and pays the landlord every month; Bob covers the
// utilities and insurance and sends her a standing order for the difference.
// Without these transfers the couple's balance drifts to several thousand
// euros, which is not what a shared account looks like after six months.
couple.expenses.push(
  ...['2026-04-05', '2026-05-05', '2026-06-05', '2026-07-06', '2026-08-05', '2026-09-04'].map(
    (date) =>
      E(date, 'Virement mensuel Bob → Alice', 680, 'bob', ['alice'], CAT.payment, {
        reimbursement: true,
      }),
  ),
)

const GROUPS = [coloc, couple, yc, etretat]

// ---------------------------------------------------------------------------

async function writeGroup(client, group) {
  await client.query(
    `INSERT INTO "Group" (id, name, information, currency, "currencyCode", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      group.id,
      group.name,
      group.information,
      group.currency,
      group.currencyCode,
      new Date(`${group.createdAt}T09:00:00Z`),
    ],
  )

  const participantId = {}
  for (const [key, name] of Object.entries(group.participants)) {
    participantId[key] = `${group.id}-${key}`
    await client.query(
      `INSERT INTO "Participant" (id, name, "groupId") VALUES ($1, $2, $3)`,
      [participantId[key], name, group.id],
    )
  }

  const allKeys = Object.keys(group.participants)
  let index = 0

  for (const expense of group.expenses) {
    index += 1
    const id = `${group.id}-e${String(index).padStart(3, '0')}`
    const keys = expense.forWhom === 'all' ? allKeys : expense.forWhom

    // The expense list sorts by [expenseDate desc, createdAt desc]. Giving
    // every row a distinct createdAt keeps that order total, so same-day
    // expenses never swap places between reads.
    const createdAt = new Date(`${expense.date}T08:00:00Z`)
    createdAt.setMinutes(createdAt.getMinutes() + index)

    await client.query(
      `INSERT INTO "Expense"
         (id, "groupId", "expenseDate", title, "categoryId", amount,
          "originalAmount", "originalCurrency", "conversionRate",
          "paidById", "isReimbursement", "splitMode", "createdAt", notes,
          "recurrenceRule")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id,
        group.id,
        expense.date,
        expense.title,
        expense.category,
        expense.amount,
        expense.original?.amount ?? null,
        expense.original?.currency ?? null,
        expense.original?.rate ?? null,
        participantId[expense.by],
        expense.reimbursement ?? false,
        expense.split ?? 'EVENLY',
        createdAt,
        expense.notes ?? null,
        expense.recurring ?? 'NONE',
      ],
    )

    for (const key of keys) {
      await client.query(
        `INSERT INTO "ExpensePaidFor" ("expenseId", "participantId", shares)
         VALUES ($1, $2, $3)`,
        [id, participantId[key], expense.shares?.[key] ?? 1],
      )
    }
  }

  return group.expenses.length
}

/**
 * Writes the demo data. Called by the CLI below and by /api/demo-seed, so the
 * command line and the in-app button cannot drift apart.
 */
export async function seedDemoGroups({ log = () => {} } = {}) {
  const connectionString = process.env.POSTGRES_PRISMA_URL
  if (!connectionString) {
    throw new Error(
      'POSTGRES_PRISMA_URL is not set. Copy .env.example to .env first.',
    )
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    // Idempotent by fixed ids: only the demo groups go. Cascades take
    // participants, expenses, paid-for rows and activities with them, and a
    // group the participant created themselves is untouched.
    const { rowCount } = await client.query(
      `DELETE FROM "Group" WHERE id = ANY($1::text[])`,
      [DEMO_GROUP_IDS],
    )
    if (rowCount > 0) log(`Removed ${rowCount} existing demo group(s).`)

    let total = 0
    for (const group of GROUPS) {
      const count = await writeGroup(client, group)
      total += count
      log(`  ${group.name} — ${count} expenses`)
    }

    log(`\nSeeded ${GROUPS.length} groups, ${total} expenses.`)
    return { groups: demoGroupSummaries(), expenses: total }
  } finally {
    await client.end()
  }
}

// CLI entry point. Skipped when this module is imported by the app.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedDemoGroups({ log: (line) => console.log(line) })
  console.log(
    'Now open http://localhost:3000/demo once — the group list lives in the',
  )
  console.log(
    'browser, so that page adds the four groups to it and signs you in as Alice.',
  )
}
