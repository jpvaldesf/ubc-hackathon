import type { PhotoShot } from '../../services/types';

/**
 * Reference photos for the guided capture steps: five photos from one apartment series by Chris Olszewski
 * (Wikimedia Commons, CC BY-SA 4.0). They show what framing to aim for. They are NOT inspection evidence,
 * are never uploaded, and are not interiors of the demo property. Files are resized copies in public/reference.
 */
export interface ReferenceGuide {
  /** Backend shot id this step maps to. Ids are unchanged; only the shot list's labels follow these steps. */
  shotId: string;
  room: string;
  label: string;
  src: string;
  alt: string;
  /** Short instruction based on landmarks visible in the reference. */
  landmarks: string;
  sourceUrl: string;
}

export const REFERENCE_GUIDES: readonly ReferenceGuide[] = [
  {
    shotId: 's1',
    room: 'living room',
    label: 'Lounge, toward the TV wall',
    src: '/reference/ref1.jpg',
    alt: 'Reference: lounge seen from the dining table, with the sofa, TV wall, ceiling fan and balcony doors',
    landmarks: 'Stand by the dining table. Keep the ceiling fan at the top, the TV wall in the middle and the balcony doors on the right.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lounge,_Interior_of_apartment_in_Brisbane,_2025,.jpg',
  },
  {
    shotId: 's2',
    room: 'kitchen',
    label: 'Kitchen, counter and cabinets',
    src: '/reference/ref2.jpg',
    alt: 'Reference: kitchen with the island counter, tall cabinets, fridge on the left and framed maps on the right wall',
    landmarks: 'Frame the island counter in the center, the fridge at the left edge and the framed pictures on the right wall.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kitchen,_Interior_of_apartment_in_Brisbane,_2025,_03.jpg',
  },
  {
    shotId: 's3',
    room: 'dining room',
    label: 'Dining area, table and bookcases',
    src: '/reference/ref3.jpg',
    alt: 'Reference: dining area with the table, two bookcases, wall-mounted air conditioner and built-in wardrobe',
    landmarks: 'Center the dining table and the two bookcases. Include the air conditioner top right and the wardrobe doors on the right.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Dinning,_Interior_of_apartment_in_Brisbane,_2025,_04.jpg',
  },
  {
    shotId: 's4',
    room: 'bedroom',
    label: 'Bedroom, bed and window wall',
    src: '/reference/ref4.jpg',
    alt: 'Reference: bedroom with the bed, two bedside tables with lamps, framed pictures and the window',
    landmarks: 'Stand in the corner by the door. Keep both bedside lamps, the framed pictures between them and the window in view.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bedroom,_Interior_of_apartment_in_Brisbane,_2025,_02.jpg',
  },
  {
    shotId: 's5',
    room: 'bathroom',
    label: 'Bathroom, shower and vanity',
    src: '/reference/ref5.jpg',
    alt: 'Reference: bathroom with the glass shower on the left, towel rails in the middle and the double vanity with mirror on the right',
    landmarks: 'Frame the shower on the left, the towel rails in the middle and the double vanity and mirror on the right.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bathroom,_Interior_of_apartment_in_Brisbane,_2025,_08.jpg',
  },
];

export const REFERENCE_CREDIT = {
  author: 'Chris Olszewski',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  modification: 'Resized and recompressed; framing unchanged.',
} as const;

/**
 * The guide for a shot, by backend shot id. It applies only when the shot's label is the guided one, so a lease
 * with another shot list (for example the server default) never gets a reference photo of a different spot.
 */
export function guideForShot(shot: PhotoShot): ReferenceGuide | undefined {
  return REFERENCE_GUIDES.find((g) => g.shotId === shot.id && g.label === shot.label);
}
