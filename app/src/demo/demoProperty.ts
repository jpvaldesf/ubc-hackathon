/**
 * The one canonical demo configuration: the example property and the two fictional participants.
 * Everything that shows or seeds a demo lease (live demo lease, sample data, tests) reads from here.
 * Park La Brea is a real residential community used only as an example location. The lease, deposit,
 * and both people are fictional, and no unit number, rent, or availability is claimed.
 */
export const DEMO_PROPERTY = {
  name: 'Park La Brea',
  address: '6200 W 3rd St, Los Angeles, CA 90036',
  officialUrl: 'https://www.parklabrea.com/',
  image: {
    src: '/property/park-la-brea.jpg',
    alt: 'Street view of the Park La Brea apartment buildings in Los Angeles',
    width: 480,
    height: 262,
    credit: {
      title: 'Park La Brea apartment house',
      author: 'Downtowngal',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Park_La_Brea_apartment_house.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      modification: 'Resized from the original; no other changes.',
    },
  },
} as const;

/** Fictional demo participants. Internal user ids (tenant_demo, landlord_demo) are unchanged. */
export const DEMO_PEOPLE = {
  tenantName: 'John Doe',
  landlordName: 'Jane Doe',
} as const;

/**
 * The active demo property: Marks Tower, a USC residence hall (source: https://housing.usc.edu/index.php/buildings/marks-tower/).
 * The inspection is staged and the lease is fictional: USC is not the landlord, does not use this product, and no
 * room number is claimed. No building photo is bundled; the thumbnail is a building icon until a genuine one is supplied
 * (set `image` in propertyFromAddress and add the file with its credit).
 */
export const MARKS_TOWER = {
  name: 'Marks Tower',
  street: '612 Hellman Way, Los Angeles, CA 90089',
  /** What a lease created for this demo stores as its address. */
  address: 'Marks Tower, 612 Hellman Way, Los Angeles, CA 90089',
  type: 'Dorm Room',
  context: 'Staged dorm inspection · fictional demo lease',
  disclaimer: 'Not affiliated with USC. USC is not the landlord and does not use this product.',
  sourceUrl: 'https://housing.usc.edu/index.php/buildings/marks-tower/',
} as const;

/**
 * The previous fictional "Example Apartment" scenario, kept only so leases created with it still display as they did.
 * Its interiors were example photos (one apartment series by Chris Olszewski, Wikimedia Commons, CC BY-SA 4.0).
 */
export const EXAMPLE_APARTMENT = {
  name: 'Example Apartment',
  image: {
    src: '/property/example-apartment.jpg',
    alt: 'Example apartment lounge with a sofa, TV wall, ceiling fan and balcony doors',
    credit: {
      author: 'Chris Olszewski',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lounge,_Interior_of_apartment_in_Brisbane,_2025,.jpg',
      license: 'CC BY-SA 4.0',
    },
  },
} as const;

export interface PropertyInfo {
  /** Short name shown as the heading. */
  label: string;
  /** Street address shown beneath it. Absent when the label is already the address or there is none. */
  address?: string;
  /** Present for the canonical example properties. */
  isExample?: boolean;
  /** "Dorm Room" and the context label, for the active demo property. */
  type?: string;
  context?: string;
  /** Shown under the property on every screen that shows it. */
  disclaimer?: string;
  /** No photo is available: show a simple building icon in the thumbnail. */
  icon?: 'building';
  /** Small context image and its credit, for the example properties only. */
  image?: { src: string; alt: string };
  credit?: { author: string; license: string; sourceUrl: string };
  /** One line about the inspection photos, when they are staged demo evidence. */
  evidenceNote?: string;
}

/**
 * Turns the address a lease carries into what the screen shows. Marks Tower is the active demo property;
 * "Example Apartment" and the Park La Brea address are kept for older demo leases; any other address is shown exactly as stored.
 */
export function propertyFromAddress(address: string): PropertyInfo {
  const normalized = address.trim().toLowerCase();
  if (normalized.includes('612 hellman way')) {
    return {
      label: MARKS_TOWER.name,
      address: MARKS_TOWER.street,
      isExample: true,
      type: MARKS_TOWER.type,
      context: MARKS_TOWER.context,
      disclaimer: MARKS_TOWER.disclaimer,
      icon: 'building',
      evidenceNote: 'Staged demo photos, not documented conditions at Marks Tower.',
    };
  }
  if (normalized === EXAMPLE_APARTMENT.name.toLowerCase()) {
    return { label: EXAMPLE_APARTMENT.name, isExample: true, image: EXAMPLE_APARTMENT.image, credit: EXAMPLE_APARTMENT.image.credit };
  }
  if (normalized === DEMO_PROPERTY.address.toLowerCase()) {
    return {
      label: DEMO_PROPERTY.name,
      address: DEMO_PROPERTY.address,
      isExample: true,
      image: DEMO_PROPERTY.image,
      credit: DEMO_PROPERTY.image.credit,
      evidenceNote: `Staged demo photos, not documented conditions at ${DEMO_PROPERTY.name}.`,
    };
  }
  return { label: address };
}
