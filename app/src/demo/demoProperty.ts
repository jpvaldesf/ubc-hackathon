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

export interface PropertyInfo {
  /** Short name shown as the heading. */
  label: string;
  /** Street address shown beneath it. Absent when the label is already the address. */
  address?: string;
  /** Present only for the canonical example property. */
  isExample?: boolean;
}

/**
 * Turns the address a lease carries into what the screen shows. The canonical demo address gets the
 * short property name; any other address is shown exactly as stored.
 */
export function propertyFromAddress(address: string): PropertyInfo {
  if (address.trim().toLowerCase() === DEMO_PROPERTY.address.toLowerCase()) {
    return { label: DEMO_PROPERTY.name, address: DEMO_PROPERTY.address, isExample: true };
  }
  return { label: address };
}
