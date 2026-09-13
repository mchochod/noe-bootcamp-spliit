// The demo dataset: six groups telling one story around Alice, who is in all
// of them. Kept apart from the writer in seed.mjs so this file can stay a
// readable table of facts.
//
// Everything is dated **relative to the day the seed runs**. A workshop run six
// months from now must still open on a "Today" section, a populated "Last 30
// days", and a history that reads as a past — not on expenses dated in the
// future. Amounts never move, only dates, which is why the settlement transfers
// at the bottom of the closed groups stay exact forever.
//
// Two conventions before editing:
//   - amounts are in minor units (cents), like the Expense.amount column;
//   - shares must satisfy the invariants enforced in src/lib/schemas.ts —
//     BY_PERCENTAGE sums to 10000 (basis points), BY_AMOUNT sums to the
//     expense amount, BY_SHARES is any set of integers.

const cents = (value) => Math.round(value * 100)

// Local components, never toISOString(): expenseDate is a calendar day, and
// west of UTC the UTC rendering of "today" is yesterday.
const isoLocal = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const TODAY = new Date()
const TODAY_ISO = isoLocal(TODAY)

const daysAgo = (n) => {
  const date = new Date(TODAY)
  date.setDate(date.getDate() - n)
  return isoLocal(date)
}

/** `n` months back, on `day` of that month, clamped to that month's length. */
const monthsAgo = (n, day = 1) => {
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth() - n, 1)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return isoLocal(date)
}

/** Months from `from` back to `to`, most distant first. */
const monthsRange = (from, to) => {
  const months = []
  for (let n = from; n >= to; n--) months.push(n)
  return months
}

// A monthly series can overshoot: seeded on the 1st, "the 5th of this month" is
// in the future. Drop those rather than showing tomorrow's rent.
const notFuture = (expense) => expense.date <= TODAY_ISO

// The story, in months before today. Alice and Bob shared a flat for a year,
// started seeing each other during it, and moved out together into their own
// place eighteen months ago.
const T = {
  colocStart: 30,
  datingStart: 24,
  moveIn: 18,
  london: 5,
  copenhagen: 3,
  ycFrom: 3,
  ycTo: 2,
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
// 1. Coloc Oberkampf — a year of flatsharing, closed when Alice and Bob left.
// ---------------------------------------------------------------------------

const colocPayers = ['alice', 'bob', 'karim', 'lea']

const coloc = {
  id: 'demo-coloc',
  name: 'Coloc Oberkampf',
  currency: '€',
  currencyCode: 'EUR',
  information:
    'Un an rue Oberkampf. Groupe soldé : Alice et Bob ont pris un appartement, Karim et Léa ont repris le bail.',
  createdAt: monthsAgo(T.colocStart, 1),
  participants: { alice: 'Alice', bob: 'Bob', karim: 'Karim', lea: 'Léa' },
  expenses: [
    ...monthsRange(T.colocStart, T.moveIn + 1).map((n, index) =>
      // Alice and Bob have the two big bedrooms, hence the uneven shares.
      E(monthsAgo(n, 3), 'Loyer + charges', 2100, colocPayers[index % 4], 'all', CAT.rent, {
        split: 'BY_SHARES',
        shares: { alice: 6, bob: 6, karim: 5, lea: 5 },
        recurring: 'MONTHLY',
      }),
    ),
    ...monthsRange(T.colocStart, T.moveIn + 1).map((n) =>
      E(monthsAgo(n, 8), 'Internet Free', 39.99, 'karim', 'all', CAT.internet, {
        recurring: 'MONTHLY',
      }),
    ),
    E(monthsAgo(30, 6), 'Courses Franprix', 78.4, 'lea', 'all', CAT.groceries),
    E(monthsAgo(30, 19), 'Pizza du vendredi', 46.0, 'bob', 'all', CAT.diningOut, {
      notes: 'Tradition du vendredi soir, on alterne qui commande.',
    }),
    E(monthsAgo(29, 12), 'Électricité EDF', 168.4, 'alice', 'all', CAT.electricity),
    E(monthsAgo(29, 24), 'Courses Grand Frais', 92.15, 'karim', 'all', CAT.groceries),
    E(monthsAgo(28, 9), 'Ventilateur salon', 64.9, 'bob', 'all', CAT.furniture, {
      notes: 'Canicule. Racheté après que le premier a rendu l’âme.',
    }),
    E(monthsAgo(27, 6), 'Courses Franprix', 71.2, 'alice', 'all', CAT.groceries),
    E(monthsAgo(27, 14), 'Produits ménagers', 34.75, 'lea', 'all', CAT.supplies),
    E(monthsAgo(26, 27), 'Électricité EDF', 195.2, 'bob', 'all', CAT.electricity),
    E(monthsAgo(25, 11), 'Courses Grand Frais', 88.6, 'bob', 'all', CAT.groceries),
    E(monthsAgo(25, 25), 'Soirée d’anniversaire', 112.3, 'lea', 'all', CAT.liquor, {
      notes: 'Courses boissons, remboursé en partie par les invités.',
    }),
    E(monthsAgo(24, 15), 'Courses Franprix', 95.0, 'karim', 'all', CAT.groceries),
    E(monthsAgo(23, 22), 'Plombier fuite salle de bain', 180.0, 'alice', 'all', CAT.services, {
      notes: 'À refacturer au propriétaire, devis envoyé la semaine suivante.',
    }),
    E(monthsAgo(23, 29), 'Électricité EDF', 142.1, 'karim', 'all', CAT.electricity),
    E(monthsAgo(22, 13), 'Grand repas coloc', 156.8, 'bob', 'all', CAT.diningOut),
    E(monthsAgo(21, 10), 'Courses Franprix', 83.45, 'alice', 'all', CAT.groceries),
    E(monthsAgo(21, 24), 'Cadeau anniversaire Karim', 60.0, 'alice', ['alice', 'bob', 'lea'], CAT.gifts, {
      notes: 'Ne pas en parler à Karim avant samedi.',
    }),
    E(monthsAgo(20, 31), 'Électricité EDF', 121.75, 'lea', 'all', CAT.electricity),
    E(monthsAgo(20, 14), 'Courses Grand Frais', 76.3, 'karim', 'all', CAT.groceries),
    E(monthsAgo(19, 28), 'Ménage de fin de bail', 240.0, 'bob', 'all', CAT.cleaning, {
      notes: 'Société de nettoyage, exigée par l’agence pour l’état des lieux.',
    }),
    E(monthsAgo(19, 14), 'Fête de départ', 128.6, 'alice', 'all', CAT.liquor),
    // Settling up. These are exactly the transfers the balances screen suggests
    // for everything above, so the closed group ends at zero — the point of
    // contrast with the groups that are still running.
    E(monthsAgo(T.moveIn, 5), 'Solde de tout compte — Alice → Karim', 565.03, 'alice', ['karim'], CAT.payment, {
      reimbursement: true,
    }),
    E(monthsAgo(T.moveIn, 5), 'Solde de tout compte — Bob → Karim', 229.21, 'bob', ['karim'], CAT.payment, {
      reimbursement: true,
    }),
    E(monthsAgo(T.moveIn, 6), 'Solde de tout compte — Bob → Léa', 236.01, 'bob', ['lea'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

// ---------------------------------------------------------------------------
// 2. Alice & Bob — dating while flatmates, then their own place.
// ---------------------------------------------------------------------------

const SIXTY_FORTY = { split: 'BY_PERCENTAGE', shares: { alice: 6000, bob: 4000 } }

const couple = {
  id: 'demo-couple',
  name: 'Alice & Bob',
  currency: '€',
  currencyCode: 'EUR',
  information:
    'Nos dépenses communes. Loyer et charges au prorata des revenus (60/40), le reste moitié-moitié.',
  createdAt: monthsAgo(T.datingStart, 1),
  participants: { alice: 'Alice', bob: 'Bob' },
  expenses: [
    // Still flatmates, this group is only for the two of them.
    E(monthsAgo(24, 15), 'Premier resto', 68.5, 'bob', 'all', CAT.diningOut, {
      notes: 'Le Petit Cambodge. À refaire.',
    }),
    E(monthsAgo(23, 5), 'Cinéma', 24.6, 'alice', 'all', CAT.movies),
    E(monthsAgo(23, 26), 'Week-end Deauville', 214.0, 'alice', 'all', CAT.hotel),
    E(monthsAgo(22, 17), 'Concert Olympia', 96.0, 'bob', 'all', CAT.entertainment),
    E(monthsAgo(21, 8), 'Brunch', 43.2, 'alice', 'all', CAT.diningOut),
    E(monthsAgo(21, 21), 'Festival', 37.8, 'bob', 'all', CAT.liquor),
    E(monthsAgo(20, 12), 'Train Bordeaux', 138.0, 'alice', 'all', CAT.train),
    E(monthsAgo(19, 2), 'Airbnb Biarritz', 620.0, 'bob', 'all', CAT.hotel, {
      notes: 'Cinq nuits, annulation gratuite jusqu’à une semaine avant.',
    }),
    E(monthsAgo(19, 6), 'Location planches de surf', 90.0, 'alice', 'all', CAT.sports),
    E(monthsAgo(19, 24), 'Visites d’appartements', 18.6, 'alice', 'all', CAT.transportation, {
      notes: 'Métro et café entre deux visites.',
    }),
    // Moving in.
    E(monthsAgo(T.moveIn, 4), 'Caution appartement', 2900.0, 'alice', 'all', CAT.rent, {
      ...SIXTY_FORTY,
      notes: 'Récupérable en fin de bail. Deux mois de loyer.',
    }),
    E(monthsAgo(T.moveIn, 6), 'Camion déménagement', 189.0, 'bob', 'all', CAT.transportation),
    E(monthsAgo(T.moveIn, 11), 'Canapé', 849.0, 'alice', 'all', CAT.furniture),
    E(monthsAgo(T.moveIn, 12), 'IKEA — le reste', 412.35, 'bob', 'all', CAT.furniture, {
      notes: 'Étagères, lampes, vaisselle. Ticket dans le tiroir si besoin de rapporter.',
    }),
    E(monthsAgo(T.moveIn, 15), 'Assurance habitation MAIF', 264.0, 'bob', 'all', CAT.insurance, {
      ...SIXTY_FORTY,
      notes: 'Prime annuelle, prélevée sur le compte de Bob.',
    }),
    // Alice holds the lease and pays the landlord; Bob covers utilities and
    // sends her a standing order. Without the transfers the balance drifts to
    // several thousand euros, which is not what a shared account looks like.
    ...monthsRange(T.moveIn, 0)
      .map((n) =>
        E(monthsAgo(n, 2), 'Loyer Rue de Charonne', 1450, 'alice', 'all', CAT.rent, {
          ...SIXTY_FORTY,
          recurring: 'MONTHLY',
        }),
      )
      .filter(notFuture),
    ...monthsRange(T.moveIn, 0)
      .map((n) =>
        E(monthsAgo(n, 5), 'Virement mensuel Bob → Alice', 595, 'bob', ['alice'], CAT.payment, {
          reimbursement: true,
        }),
      )
      .filter(notFuture),
    ...monthsRange(T.moveIn, 1)
      .map((n) =>
        E(monthsAgo(n, 28), 'Internet Orange', 44.99, 'bob', 'all', CAT.internet, {
          recurring: 'MONTHLY',
        }),
      )
      .filter(notFuture),
    E(monthsAgo(17, 19), 'Courses Monoprix', 112.4, 'alice', 'all', CAT.groceries),
    E(monthsAgo(16, 16), 'Électricité', 87.2, 'alice', 'all', CAT.electricity),
    E(monthsAgo(15, 24), 'Resto avec Marc et Camille', 142.0, 'bob', 'all', CAT.diningOut),
    E(monthsAgo(14, 7), 'Courses Monoprix', 104.3, 'bob', 'all', CAT.groceries),
    E(monthsAgo(13, 12), 'Théâtre', 78.0, 'bob', 'all', CAT.entertainment),
    E(monthsAgo(12, 20), 'Cadeaux de Noël familles', 240.0, 'alice', 'all', CAT.gifts, {
      notes: 'Moitié pour ses parents, moitié pour les miens.',
    }),
    E(monthsAgo(12, 28), 'Électricité', 118.4, 'bob', 'all', CAT.electricity),
    E(monthsAgo(11, 11), 'Courses Monoprix', 96.75, 'bob', 'all', CAT.groceries),
    E(monthsAgo(10, 14), 'Saint-Valentin', 156.0, 'bob', 'all', CAT.diningOut),
    E(monthsAgo(9, 9), 'Plombier', 145.0, 'alice', 'all', CAT.services),
    E(monthsAgo(8, 17), 'Courses Monoprix', 118.9, 'alice', 'all', CAT.groceries),
    E(monthsAgo(8, 26), 'Électricité', 79.4, 'bob', 'all', CAT.electricity),
    E(monthsAgo(7, 6), 'Vélo d’occasion', 320.0, 'alice', 'all', CAT.transportation, {
      notes: 'Pour Bob, il rembourse la moitié dans le virement du mois.',
    }),
    E(monthsAgo(6, 22), 'Courses Monoprix', 87.65, 'bob', 'all', CAT.groceries),
    E(monthsAgo(5, 30), 'Pizza et série', 32.4, 'alice', 'all', CAT.diningOut),
    E(monthsAgo(4, 13), 'Électricité', 91.3, 'alice', 'all', CAT.electricity),
    E(monthsAgo(4, 25), 'Courses Monoprix', 103.2, 'bob', 'all', CAT.groceries),
    E(monthsAgo(2, 18), 'Courses Monoprix', 94.8, 'bob', 'all', CAT.groceries, {
      notes: 'Alice à San Francisco, courses pour un seul.',
    }),
    E(monthsAgo(1, 9), 'Resto retour d’Alice', 96.5, 'bob', 'all', CAT.diningOut),
    // The recent tail, so there is always a "Today" and a populated last month.
    E(daysAgo(26), 'Électricité', 91.3, 'alice', 'all', CAT.electricity),
    E(daysAgo(19), 'Resto rentrée', 74.5, 'bob', 'all', CAT.diningOut),
    E(daysAgo(14), 'Courses Monoprix', 102.15, 'alice', 'all', CAT.groceries),
    E(daysAgo(9), 'Pharmacie', 38.2, 'bob', 'all', CAT.medical, {
      notes: 'Remboursé par la mutuelle, à vérifier en fin de mois.',
    }),
    E(daysAgo(5), 'Cinéma', 27.0, 'alice', 'all', CAT.movies),
    E(daysAgo(2), 'Marché', 46.8, 'bob', 'all', CAT.groceries),
    E(daysAgo(0), 'Courses Monoprix', 64.25, 'alice', 'all', CAT.groceries),
  ],
}

// ---------------------------------------------------------------------------
// 3. Londres — six people, five months ago, settled and done.
// ---------------------------------------------------------------------------

const london = {
  id: 'demo-london',
  name: 'Londres entre amis',
  currency: '€',
  currencyCode: 'EUR',
  information: 'Quatre jours à Londres. Tout est remboursé, le groupe est clos.',
  createdAt: monthsAgo(T.london + 1, 20),
  participants: {
    alice: 'Alice',
    bob: 'Bob',
    marc: 'Marc',
    camille: 'Camille',
    lea: 'Léa',
    karim: 'Karim',
  },
  expenses: [
    E(monthsAgo(T.london + 1, 20), 'Eurostar aller-retour', 1146.0, 'camille', 'all', CAT.train, {
      notes: 'Six billets réservés d’un coup, trois mois à l’avance.',
    }),
    E(monthsAgo(T.london, 8), 'Airbnb Shoreditch', 1284.0, 'alice', 'all', CAT.hotel),
    E(monthsAgo(T.london, 8), 'Courses Sainsbury’s', 96.4, 'lea', 'all', CAT.groceries),
    E(monthsAgo(T.london, 8), 'Pub le premier soir', 187.2, 'karim', 'all', CAT.liquor),
    E(monthsAgo(T.london, 9), 'Oyster cards', 138.0, 'bob', 'all', CAT.transportation),
    E(monthsAgo(T.london, 9), 'Tate Modern — expo', 96.0, 'marc', ['marc', 'alice', 'camille', 'lea'], CAT.entertainment, {
      notes: 'Bob et Karim sont allés voir un match à la place.',
    }),
    E(monthsAgo(T.london, 9), 'Match à Craven Cottage', 164.0, 'karim', ['karim', 'bob'], CAT.sports),
    E(monthsAgo(T.london, 9), 'Dîner Brick Lane', 213.6, 'camille', 'all', CAT.diningOut),
    E(monthsAgo(T.london, 10), 'Borough Market', 121.8, 'alice', 'all', CAT.diningOut),
    E(monthsAgo(T.london, 10), 'Comédie musicale', 342.0, 'lea', 'all', CAT.entertainment, {
      notes: 'Six places au dernier balcon, réservées sur place le matin.',
    }),
    E(monthsAgo(T.london, 11), 'Petit-déjeuner', 78.6, 'bob', 'all', CAT.diningOut),
    E(monthsAgo(T.london, 11), 'Taxi vers St Pancras', 64.0, 'marc', 'all', CAT.taxi),
    // Settled two weeks after everyone got home.
    E(monthsAgo(T.london, 25), 'Remboursement Bob → Alice', 477.34, 'bob', ['alice'], CAT.payment, {
      reimbursement: true,
    }),
    E(monthsAgo(T.london, 25), 'Remboursement Marc → Alice', 292.52, 'marc', ['alice'], CAT.payment, {
      reimbursement: true,
    }),
    E(monthsAgo(T.london, 25), 'Remboursement Marc → Camille', 183.41, 'marc', ['camille'], CAT.payment, {
      reimbursement: true,
    }),
    E(monthsAgo(T.london, 26), 'Remboursement Léa → Camille', 197.53, 'lea', ['camille'], CAT.payment, {
      reimbursement: true,
    }),
    E(monthsAgo(T.london, 26), 'Remboursement Karim → Camille', 342.73, 'karim', ['camille'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

// ---------------------------------------------------------------------------
// 4. Copenhague — five people, three months ago, nobody has paid anyone back.
// ---------------------------------------------------------------------------

const copenhagen = {
  id: 'demo-copenhagen',
  name: 'Copenhague',
  currency: '€',
  currencyCode: 'EUR',
  information:
    'Long week-end à Copenhague. Personne n’a encore remboursé personne — c’est le groupe à solder.',
  createdAt: monthsAgo(T.copenhagen + 1, 12),
  participants: {
    alice: 'Alice',
    bob: 'Bob',
    marc: 'Marc',
    lea: 'Léa',
    karim: 'Karim',
  },
  expenses: [
    E(monthsAgo(T.copenhagen + 1, 12), 'Vols Paris → Copenhague', 745.0, 'marc', 'all', CAT.plane, {
      notes: 'Cinq allers-retours, tarif promo.',
    }),
    E(monthsAgo(T.copenhagen, 4), 'Appartement Nørrebro', 960.0, 'alice', 'all', CAT.hotel),
    E(monthsAgo(T.copenhagen, 4), 'Courses Netto', 88.3, 'lea', 'all', CAT.groceries),
    E(monthsAgo(T.copenhagen, 4), 'Location de vélos', 175.0, 'bob', 'all', CAT.sports, {
      notes: 'Trois jours, c’est la ville qui veut ça.',
    }),
    E(monthsAgo(T.copenhagen, 5), 'Déjeuner smørrebrød', 132.5, 'karim', 'all', CAT.diningOut),
    E(monthsAgo(T.copenhagen, 5), 'Tivoli', 210.0, 'alice', 'all', CAT.entertainment),
    E(monthsAgo(T.copenhagen, 5), 'Bar à cocktails', 148.9, 'marc', ['marc', 'bob', 'karim'], CAT.liquor, {
      notes: 'Alice et Léa sont rentrées après le dîner.',
    }),
    E(monthsAgo(T.copenhagen, 6), 'Musée du design', 72.0, 'lea', ['lea', 'alice'], CAT.entertainment),
    E(monthsAgo(T.copenhagen, 6), 'Dîner Reffen', 196.4, 'bob', 'all', CAT.diningOut),
    E(monthsAgo(T.copenhagen, 6), 'Souvenirs et cartes postales', 43.6, 'lea', 'all', CAT.gifts),
    E(monthsAgo(T.copenhagen, 7), 'Petit-déjeuner', 67.5, 'karim', 'all', CAT.diningOut),
    E(monthsAgo(T.copenhagen, 7), 'Train vers l’aéroport', 45.0, 'alice', 'all', CAT.train),
  ],
}

// ---------------------------------------------------------------------------
// 5. YC Combinator Summer26 — a month in San Francisco, in dollars.
// ---------------------------------------------------------------------------

const yc = {
  id: 'demo-yc',
  name: 'YC Combinator Summer26',
  currency: '$',
  currencyCode: 'USD',
  information:
    'Un mois à San Francisco pour la summer batch. Colocation à la Hexa House. Tout est en dollars, on solde au retour.',
  createdAt: monthsAgo(T.ycFrom + 1, 20),
  participants: { alice: 'Alice', marc: 'Marc', camille: 'Camille' },
  expenses: [
    // Booked in euros from Paris; stored in dollars with the rate of the day.
    // Camille changed her return date, so each founder carries their own fare.
    E(monthsAgo(T.ycFrom + 1, 22), 'Vols Paris → SFO', 2814.0, 'alice', 'all', CAT.plane, {
      split: 'BY_AMOUNT',
      shares: { alice: 81200, marc: 81200, camille: 119000 },
      original: { amount: 260000, currency: 'EUR', rate: '1.0823' },
      notes: 'Payé en euros sur la carte d’Alice. Camille rentre une semaine plus tard.',
    }),
    E(monthsAgo(T.ycFrom, 1), 'Hexa House — premier mois', 4500.0, 'marc', 'all', CAT.rent, {
      notes: 'Trois chambres, un mois. Virement fait avant le départ.',
    }),
    E(monthsAgo(T.ycFrom, 1), 'Deposit Hexa House', 1500.0, 'camille', 'all', CAT.rent, {
      notes: 'Rendu au checkout si rien de cassé.',
    }),
    E(monthsAgo(T.ycFrom, 2), 'Uber SFO → Mission', 68.4, 'camille', 'all', CAT.taxi),
    E(monthsAgo(T.ycFrom, 2), 'Cartes SIM Mint Mobile', 90.0, 'alice', 'all', CAT.internet),
    E(monthsAgo(T.ycFrom, 3), 'Trader Joe’s', 187.6, 'marc', 'all', CAT.groceries),
    E(monthsAgo(T.ycFrom, 4), 'Domaine + Stripe fees', 100.0, 'alice', 'all', CAT.services, {
      notes: 'Cent dollars à trois, le centime orphelin est pour quelqu’un.',
    }),
    E(monthsAgo(T.ycFrom, 6), 'Coworking day passes', 135.0, 'camille', 'all', CAT.services),
    E(monthsAgo(T.ycFrom, 8), 'Dîner avec le batch', 246.8, 'alice', 'all', CAT.diningOut),
    E(monthsAgo(T.ycFrom, 10), 'Trader Joe’s', 164.25, 'camille', 'all', CAT.groceries),
    E(monthsAgo(T.ycFrom, 11), 'Laverie', 42.0, 'marc', 'all', CAT.cleaning),
    E(monthsAgo(T.ycFrom, 13), 'Caltrain — Mountain View', 57.0, 'marc', 'all', CAT.train, {
      notes: 'Office hours chez YC.',
    }),
    E(monthsAgo(T.ycFrom, 15), 'AWS credits overflow', 312.0, 'alice', 'all', CAT.services, {
      notes: 'À refacturer à la boîte, garder la facture.',
    }),
    E(monthsAgo(T.ycFrom, 17), 'Trader Joe’s', 152.9, 'alice', 'all', CAT.groceries),
    E(monthsAgo(T.ycFrom, 18), 'Pizza avant la répétition Demo Day', 78.5, 'camille', 'all', CAT.diningOut),
    E(monthsAgo(T.ycFrom, 20), 'Randonnée Marin Headlands', 96.0, 'marc', 'all', CAT.transportation, {
      notes: 'Location de voiture pour la journée, essence comprise.',
    }),
    E(monthsAgo(T.ycFrom, 22), 'Écran externe', 229.0, 'camille', ['camille', 'marc'], CAT.electronics, {
      notes: 'Alice a le sien, elle ne participe pas.',
    }),
    E(monthsAgo(T.ycFrom, 24), 'Trader Joe’s', 176.4, 'marc', 'all', CAT.groceries),
    E(monthsAgo(T.ycFrom, 26), 'Chemises Demo Day', 174.0, 'alice', 'all', CAT.clothing),
    E(monthsAgo(T.ycFrom, 28), 'Uber — investisseurs Sand Hill', 112.75, 'alice', 'all', CAT.taxi),
    E(monthsAgo(T.ycTo, 1), 'Hexa House — prorata', 1500.0, 'marc', 'all', CAT.rent),
    E(monthsAgo(T.ycTo, 2), 'Dîner Demo Day', 318.0, 'camille', 'all', CAT.diningOut, {
      notes: 'On a fêté ça. Aucun regret.',
    }),
    E(monthsAgo(T.ycTo, 4), 'Ménage de sortie', 180.0, 'alice', 'all', CAT.cleaning),
    E(monthsAgo(T.ycTo, 5), 'Uber Mission → SFO', 74.2, 'marc', ['marc', 'alice'], CAT.taxi),
    E(monthsAgo(T.ycTo, 14), 'Remboursement Marc → Alice', 640.0, 'marc', ['alice'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

// ---------------------------------------------------------------------------
// 6. Week-end à Étretat — two weeks ago, the freshest thing in the app.
// ---------------------------------------------------------------------------

const etretat = {
  id: 'demo-etretat',
  name: 'Week-end à Étretat',
  currency: '€',
  currencyCode: 'EUR',
  information: 'Trois jours en Normandie. Léa nous a rejoints en train.',
  createdAt: daysAgo(25),
  participants: {
    alice: 'Alice',
    bob: 'Bob',
    marc: 'Marc',
    camille: 'Camille',
    lea: 'Léa',
  },
  expenses: [
    E(daysAgo(14), 'Gîte 2 nuits', 480.0, 'bob', 'all', CAT.hotel, {
      notes: 'Arrhes versées le mois dernier, solde payé sur place.',
    }),
    E(daysAgo(14), 'Essence aller', 92.4, 'marc', ['marc', 'alice', 'bob', 'camille'], CAT.fuel, {
      notes: 'Léa est venue en train, elle ne participe pas à la voiture.',
    }),
    E(daysAgo(14), 'Train Paris → Le Havre', 42.0, 'lea', ['lea'], CAT.train),
    E(daysAgo(14), 'Courses du week-end', 95.0, 'alice', 'all', CAT.groceries),
    E(daysAgo(14), 'Cidre et calvados', 38.7, 'camille', 'all', CAT.liquor),
    E(daysAgo(13), 'Restaurant Le Bel Ami', 187.5, 'alice', 'all', CAT.diningOut, {
      split: 'BY_SHARES',
      // Marc and Camille took the seafood platter.
      shares: { alice: 1, bob: 1, marc: 2, camille: 2, lea: 1 },
      notes: 'Plateau de fruits de mer pour deux, le reste au menu du jour.',
    }),
    E(daysAgo(13), 'Musée Sherlock Holmes', 36.0, 'bob', ['bob', 'marc', 'lea'], CAT.entertainment),
    E(daysAgo(13), 'Crêpes', 43.2, 'camille', 'all', CAT.diningOut),
    E(daysAgo(12), 'Petit-déjeuner', 51.5, 'lea', 'all', CAT.diningOut),
    E(daysAgo(12), 'Essence retour', 88.9, 'marc', ['marc', 'alice', 'bob', 'camille'], CAT.fuel),
    E(daysAgo(12), 'Péages', 62.4, 'bob', ['marc', 'alice', 'bob', 'camille'], CAT.transportation),
    E(daysAgo(4), 'Remboursement Camille → Bob', 74.0, 'camille', ['bob'], CAT.payment, {
      reimbursement: true,
    }),
  ],
}

export const GROUPS = [coloc, couple, london, copenhagen, yc, etretat]
export const DEMO_GROUP_IDS = GROUPS.map(({ id }) => id)
export const demoGroupSummaries = () => GROUPS.map(({ id, name }) => ({ id, name }))
