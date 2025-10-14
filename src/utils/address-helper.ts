/**
 * Address Helper Functions
 * Utilities for working with addresses
 */

interface AddressData {
  address: string;
  ward?: number;
  district?: number;
  province: number;
  latitude: number;
  longitude: number;
  country?: string;
}

/**
 * Validate coordinates
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Validate Vietnam coordinates (approximately)
 */
export function validateVietnamCoordinates(lat: number, lng: number): boolean {
  // Vietnam bounds: approximately 8°N to 24°N, 102°E to 110°E
  return lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format address for display
 */
export async function formatAddress(addressData: AddressData): Promise<string> {
  const parts: string[] = [addressData.address];

  try {
    if (addressData.ward) {
      const ward = await strapi.entityService.findOne('api::ward.ward', addressData.ward, {
        fields: ['name'],
      });
      if (ward) parts.push(ward.name);
    }

    if (addressData.district) {
      const district = await strapi.entityService.findOne(
        'api::district.district',
        addressData.district,
        { fields: ['name'] }
      );
      if (district) parts.push(district.name);
    }

    if (addressData.province) {
      const province = await strapi.entityService.findOne(
        'api::province.province',
        addressData.province,
        { fields: ['name'] }
      );
      if (province) parts.push(province.name);
    }

    if (addressData.country) {
      parts.push(addressData.country);
    }

    return parts.join(', ');
  } catch (error) {
    strapi.log.error('Error formatting address:', error);
    return addressData.address;
  }
}

/**
 * Get Google Maps URL for address
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Get coordinates bounds for Vietnam major cities
 */
export const VIETNAM_CITIES = {
  hanoi: { lat: 21.028511, lng: 105.804817 },
  hochiminh: { lat: 10.762622, lng: 106.660172 },
  danang: { lat: 16.047079, lng: 108.206230 },
  haiphong: { lat: 20.844787, lng: 106.688087 },
  cantho: { lat: 10.045162, lng: 105.746857 },
};

export default {
  validateCoordinates,
  validateVietnamCoordinates,
  calculateDistance,
  formatAddress,
  getGoogleMapsUrl,
  VIETNAM_CITIES,
};

