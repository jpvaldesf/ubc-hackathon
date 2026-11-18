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
 * The fresh apartment scenario: a fictional "Example Apartment" with no street address. The interiors are
 * example photos (one apartment series by Chris Olszewski, Wikimedia Commons, CC BY-SA 4.0); they are
 * guidance and context, not a real unit, and are not interiors of any real property.
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
  /** Small context image and its credit, for the example properties only. */
  image?: { src: string; alt: string };
  credit?: { author: string; license: string; sourceUrl: string };
  /** One line about the inspection photos, when they are staged demo evidence. */
  evidenceNote?: string;
}

/**
 * Turns the address a lease carries into what the screen shows. "Example Apartment" is the fresh scenario;
 * the Park La Brea address is kept for older demo leases; any other address is shown exactly as stored.
 */
export function propertyFromAddress(address: string): PropertyInfo {
  const normalized = address.trim().toLowerCase();
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
